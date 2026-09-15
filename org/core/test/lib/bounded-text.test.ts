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
