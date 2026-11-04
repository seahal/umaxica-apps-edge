import { describe, expect, it } from 'vitest';

import { readBoundedText } from '../../src/lib/bounded-text';

describe('readBoundedText', () => {
  it('returns the whole body at the exact byte bound, trimmed', async () => {
    await expect(readBoundedText(new Response('  Rails health\n'), 100)).resolves.toBe(
      'Rails health',
    );
  });

  it('rejects when UTF-8 bytes exceed the bound even if character count does not', async () => {
    await expect(readBoundedText(new Response('日本語'), 8)).rejects.toThrow(
      'response body exceeds byte limit',
    );
  });

  it('decodes across a chunk boundary at the exact byte bound', async () => {
    const bytes = new TextEncoder().encode('日本語');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 1));
        controller.enqueue(bytes.slice(1));
        controller.close();
      },
    });

    await expect(readBoundedText(new Response(stream), 9)).resolves.toBe('日本語');
  });

  it('answers empty for a response carrying no body at all', async () => {
    await expect(readBoundedText(new Response(null, { status: 204 }), 20)).resolves.toBe('');
  });

  it('rejects an oversized chunk even when cancellation refuses to complete', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('oversized body'));
      },
      cancel() {
        throw new Error('this stream cannot be cancelled');
      },
    });

    await expect(readBoundedText(new Response(stream), 10)).rejects.toThrow(
      'response body exceeds byte limit',
    );
  });

  it('honours an already-aborted signal before reading the body', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('timed out', 'TimeoutError'));

    await expect(
      readBoundedText(new Response('body'), 100, controller.signal),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});

it('rejects a non-integer or negative byte bound before touching the body', async () => {
  await expect(readBoundedText(new Response('body'), -1)).rejects.toThrow(
    'maxBytes must be a non-negative integer',
  );
  await expect(readBoundedText(new Response('body'), 1.5)).rejects.toThrow(
    'maxBytes must be a non-negative integer',
  );
});

it('rejects when the signal aborts after headers while a chunk is pending', async () => {
  const abort = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Leave the first read pending until abort fires.
      abort.signal.addEventListener(
        'abort',
        () => {
          controller.error(abort.signal.reason);
        },
        { once: true },
      );
    },
  });

  const pending = readBoundedText(new Response(stream), 100, abort.signal);
  await Promise.resolve();
  abort.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});

it('rejects an already-aborted signal that carries no reason', async () => {
  const abort = new AbortController();
  abort.abort();
  await expect(readBoundedText(new Response('body'), 100, abort.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
});

it('rejects when the signal is already aborted at the start of a subsequent chunk read', async () => {
  const abort = new AbortController();
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      if (pulls === 1) {
        controller.enqueue(new TextEncoder().encode('a'));
        abort.abort(new DOMException('stopped', 'AbortError'));
        return;
      }
      return new Promise<void>(() => {});
    },
  });

  await expect(readBoundedText(new Response(stream), 100, abort.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
});

it('uses AbortError when an aborted signal exposes an empty reason', async () => {
  const abort = new AbortController();
  abort.abort(new DOMException('x', 'AbortError'));
  Object.defineProperty(abort.signal, 'reason', { configurable: true, get: () => undefined });

  await expect(readBoundedText(new Response('body'), 100, abort.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
});

it('uses AbortError when abort fires mid-read with an empty reason', async () => {
  const abort = new AbortController();
  Object.defineProperty(abort.signal, 'reason', { configurable: true, get: () => undefined });
  const stream = new ReadableStream<Uint8Array>({
    start() {
      // First read hangs until abort rejects the race.
    },
    pull() {
      return new Promise<void>(() => {});
    },
  });

  const pending = readBoundedText(new Response(stream), 100, abort.signal);
  await Promise.resolve();
  abort.abort(new DOMException('ignored', 'AbortError'));
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});

it('uses AbortError when a subsequent chunk sees an aborted signal with empty reason', async () => {
  const abort = new AbortController();
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      if (pulls === 1) {
        controller.enqueue(new TextEncoder().encode('a'));
        abort.abort(new DOMException('stopped', 'AbortError'));
        Object.defineProperty(abort.signal, 'reason', {
          configurable: true,
          get: () => undefined,
        });
        return;
      }
      return new Promise<void>(() => {});
    },
  });

  await expect(readBoundedText(new Response(stream), 100, abort.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
});
