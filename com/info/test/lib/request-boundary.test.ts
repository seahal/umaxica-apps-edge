import { describe, expect, it } from 'vitest';

import {
  EDGE_INPUT_MAX_BYTES,
  limitRequestBody,
  requestBoundaryResponse,
} from '../../src/lib/request-boundary';

function streamedRequest(chunks: Uint8Array[]): Request {
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    duplex: 'half' as const,
  };
  return new Request('http://localhost/submit', init);
}

describe('request body boundary', () => {
  it('counts UTF-8 bytes and reconstructs an exact-size stream for the router', async () => {
    const japanese = new TextEncoder().encode('あ'.repeat(21845) + 'a');
    expect(japanese.byteLength).toBe(EDGE_INPUT_MAX_BYTES);

    const result = await limitRequestBody(streamedRequest([japanese]));

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(new Uint8Array(await result.request.arrayBuffer())).toEqual(japanese);
      expect(result.request.headers.get('content-type')).toBe('application/json');
    }
  });

  it('rejects a body one byte over the limit in a single chunk', async () => {
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(EDGE_INPUT_MAX_BYTES + 1));
          controller.close();
        },
      }),
      duplex: 'half' as const,
    };
    const request = new Request('http://localhost/submit', init);

    await expect(limitRequestBody(request)).resolves.toEqual({ kind: 'too-large' });
    expect(request.body?.locked).toBe(false);
  });

  it('rejects an unsupported content encoding before reading the body', async () => {
    const request = new Request('http://localhost/submit', {
      method: 'POST',
      headers: { 'Content-Encoding': 'gzip' },
      body: '{}',
    });

    await expect(limitRequestBody(request)).resolves.toEqual({ kind: 'unsupported-encoding' });
  });

  it.each([
    ['too-large', 413],
    ['unsupported-encoding', 415],
    ['invalid-body', 400],
  ] as const)('maps %s to its fixed response status', (kind, status) => {
    expect(requestBoundaryResponse(kind).status).toBe(status);
    expect(requestBoundaryResponse(kind).headers.get('cache-control')).toBe('no-store');
  });

  it('returns aborted when the signal is already aborted before reading', async () => {
    const abort = new AbortController();
    abort.abort();
    await expect(
      limitRequestBody(streamedRequest([new Uint8Array([1])]), abort.signal),
    ).resolves.toEqual({ kind: 'aborted' });
  });

  it('treats a non-numeric Content-Length as unknown and still enforces the stream bound', async () => {
    const request = new Request('http://localhost/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 'not-a-number',
      },
      body: new Uint8Array(EDGE_INPUT_MAX_BYTES + 1),
    });
    await expect(limitRequestBody(request)).resolves.toEqual({ kind: 'too-large' });
  });

  it('reports invalid-body when a chunk is not a Uint8Array', async () => {
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue('not-bytes' as unknown as Uint8Array);
          controller.close();
        },
      }),
      duplex: 'half' as const,
    };
    await expect(limitRequestBody(new Request('http://localhost/submit', init))).resolves.toEqual({
      kind: 'invalid-body',
    });
  });

  it('reports aborted when the body stream errors after the signal aborts', async () => {
    const abort = new AbortController();
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          abort.signal.addEventListener(
            'abort',
            () => controller.error(new Error('upstream closed')),
            { once: true },
          );
        },
      }),
      duplex: 'half' as const,
    };
    const pending = limitRequestBody(new Request('http://localhost/submit', init), abort.signal);
    await Promise.resolve();
    abort.abort();
    await expect(pending).resolves.toEqual({ kind: 'aborted' });
  });

  it('attaches the caller signal to a body-less request', async () => {
    const abort = new AbortController();
    const result = await limitRequestBody(new Request('http://localhost/submit'), abort.signal);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.request.signal).toBe(abort.signal);
    }
  });
});

describe('request body boundary edge cleanup', () => {
  it('swallows a rejecting body.cancel while refusing unsupported encoding', async () => {
    const init = {
      method: 'POST',
      headers: { 'Content-Encoding': 'gzip' },
      body: new ReadableStream<Uint8Array>({
        start() {},
        cancel() {
          return Promise.reject(new Error('cannot cancel'));
        },
      }),
      duplex: 'half' as const,
    };
    await expect(limitRequestBody(new Request('http://localhost/submit', init))).resolves.toEqual({
      kind: 'unsupported-encoding',
    });
  });

  it('returns the original body-less request when no signal is provided', async () => {
    const request = new Request('http://localhost/submit');
    const result = await limitRequestBody(request);
    expect(result).toEqual({ kind: 'ok', request });
  });

  it('returns aborted when the signal trips between streamed chunks', async () => {
    const abort = new AbortController();
    let pulls = 0;
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream<Uint8Array>({
        pull(controller) {
          pulls += 1;
          if (pulls === 1) {
            controller.enqueue(new TextEncoder().encode('{"a":'));
            abort.abort();
            return;
          }
          return new Promise<void>(() => {});
        },
      }),
      duplex: 'half' as const,
    };
    await expect(
      limitRequestBody(new Request('http://localhost/submit', init), abort.signal),
    ).resolves.toEqual({ kind: 'aborted' });
  });

  it('reports invalid-body when the stream errors without an abort', async () => {
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.error(new Error('stream broke'));
        },
      }),
      duplex: 'half' as const,
    };
    await expect(limitRequestBody(new Request('http://localhost/submit', init))).resolves.toEqual({
      kind: 'invalid-body',
    });
  });

  it('refuses unsupported encoding even when the request carries no body to cancel', async () => {
    const request = new Request('http://localhost/submit', {
      method: 'POST',
      headers: { 'Content-Encoding': 'gzip' },
    });
    expect(request.body).toBeNull();
    await expect(limitRequestBody(request)).resolves.toEqual({ kind: 'unsupported-encoding' });
  });

  it('reports invalid-body when reconstructing the Request throws', async () => {
    const OriginalRequest = globalThis.Request;
    const seed = streamedRequest([new TextEncoder().encode('{}')]);
    let rebuilds = 0;
    const RequestSpy = class extends OriginalRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        if (init?.body !== undefined) {
          rebuilds += 1;
          if (rebuilds >= 1) {
            throw new TypeError('cannot rebuild body');
          }
        }
        super(input, init);
      }
    } as typeof Request;
    globalThis.Request = RequestSpy;
    try {
      await expect(limitRequestBody(seed)).resolves.toEqual({ kind: 'invalid-body' });
    } finally {
      globalThis.Request = OriginalRequest;
    }
  });
});
