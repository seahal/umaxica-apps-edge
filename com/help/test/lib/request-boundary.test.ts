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
});
