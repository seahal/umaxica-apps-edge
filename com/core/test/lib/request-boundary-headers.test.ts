// @vitest-environment node
//
// Content-Length is a forbidden request header in browser Fetch (happy-dom).
// Node/undici and workerd accept it, which is the runtime that enforces the
// declared-length short-circuit in `limitRequestBody`.

import { describe, expect, it } from 'vitest';

import { EDGE_INPUT_MAX_BYTES, limitRequestBody } from '../../src/lib/request-boundary';

describe('request body boundary declared length', () => {
  it('rejects from Content-Length alone when the declared size exceeds the bound', async () => {
    const init = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(EDGE_INPUT_MAX_BYTES + 1),
      },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{}'));
          controller.close();
        },
      }),
      duplex: 'half' as const,
    };
    await expect(limitRequestBody(new Request('http://localhost/submit', init))).resolves.toEqual({
      kind: 'too-large',
    });
  });

  it('rejects an unsafe integer Content-Length as too-large without reading', async () => {
    const init = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '9007199254740992',
      },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{}'));
          controller.close();
        },
      }),
      duplex: 'half' as const,
    };
    await expect(limitRequestBody(new Request('http://localhost/submit', init))).resolves.toEqual({
      kind: 'too-large',
    });
  });
});
