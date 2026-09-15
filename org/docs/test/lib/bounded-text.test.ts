import { describe, expect, it } from 'vitest';

import { readBoundedText } from '../../src/lib/bounded-text';

/*
 * The byte bound itself.
 *
 * `rails-client.ts` and `core-dispatch.ts` are the only callers, and both reach
 * this helper with the same short `ProxyError: <code>` line. The helper also
 * sits below the public JSON and Health readers, so its contract is bytes, not
 * JavaScript characters. These tests exercise the stream boundary directly;
 * they do not assert an HTTP response and therefore belong here rather than in
 * `api/`.
 */

describe('readBoundedText', () => {
  it('returns the whole body at the exact byte bound, trimmed', async () => {
    await expect(readBoundedText(new Response('  ProxyError: 502\n'), 100)).resolves.toBe(
      'ProxyError: 502',
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
        // Split inside the first character: one of its three bytes arrives in
        // this chunk and the other two in the next. A byte reader with a
        // `TextDecoder` after it is what this would catch.
        controller.enqueue(bytes.slice(0, 1));
        controller.enqueue(bytes.slice(1));
        controller.close();
      },
    });

    await expect(readBoundedText(new Response(stream), 9)).resolves.toBe('日本語');
  });

  it('answers empty for a response carrying no body at all', async () => {
    // A 204 arrives here with `body === null`, and the callers classify the
    // text either way rather than branching on the status a second time.
    await expect(readBoundedText(new Response(null, { status: 204 }), 20)).resolves.toBe('');
  });

  it('rejects an oversized chunk even when cancellation refuses to complete', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('ProxyError: 502'));
      },
      cancel() {
        throw new Error('this stream cannot be cancelled');
      },
    });

    // The size violation is the result. A rejecting cancel must not replace it.
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
