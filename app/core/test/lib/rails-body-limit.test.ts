// @vitest-environment node
//
// The Rails proxy body ceiling, asserted on the pure function. Boundary
// analysis sits at `limit - 1`, `limit`, `limit + 1`; the equivalence classes
// are "declared and small", "declared and oversized", "undeclared", and
// "declared length that cannot be believed".
import { describe, expect, it } from 'vitest';

import {
  MAX_RAILS_REQUEST_BODY,
  prepareRailsBody,
  type RailsBodyState,
} from '../../src/lib/rails-body-limit';

const ORIGIN = 'https://jp.umaxica.app';

function requestWithLength(length: string | null, body: BodyInit | null = 'x') {
  const headers = new Headers({ 'content-type': 'application/octet-stream' });
  if (length !== null) headers.set('content-length', length);
  return new Request(`${ORIGIN}/api/v0/things`, { method: 'POST', headers, body });
}

/** A body of `size` bytes delivered in 64 KiB chunks, never allocated whole. */
function chunkedBody(size: number): ReadableStream<Uint8Array> {
  const chunk = new Uint8Array(65_536);
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= size) {
        controller.close();
        return;
      }
      const next = Math.min(chunk.byteLength, size - sent);
      sent += next;
      controller.enqueue(chunk.subarray(0, next));
    },
  });
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<number> {
  const reader = stream.getReader();
  let total = 0;
  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
  }
  return total;
}

describe('MAX_RAILS_REQUEST_BODY', () => {
  it('is exactly 8 MiB', () => {
    expect(MAX_RAILS_REQUEST_BODY).toBe(8 * 1024 * 1024);
    expect(MAX_RAILS_REQUEST_BODY).toBe(8_388_608);
  });
});

describe('prepareRailsBody declared Content-Length', () => {
  it.each([
    ['0', 'ok'],
    ['1', 'ok'],
    [String(MAX_RAILS_REQUEST_BODY - 1), 'ok'],
    [String(MAX_RAILS_REQUEST_BODY), 'ok'],
    [String(MAX_RAILS_REQUEST_BODY + 1), 'too-large'],
  ])('answers %s with %s', (length, kind) => {
    expect(prepareRailsBody(requestWithLength(length)).kind).toBe(kind);
  });

  it.each([
    ['an absurdly large numeric value', '99999999999999999999999'],
    ['the largest plausible attack value', '9223372036854775807'],
  ])('rejects %s as too large without reading the body', (_label, length) => {
    expect(prepareRailsBody(requestWithLength(length)).kind).toBe('too-large');
  });

  it.each([
    ['a negative value', '-1'],
    ['a non-numeric value', 'eight'],
    ['a float', '1024.5'],
    ['a hex value', '0x100'],
    ['a duplicated list', '10, 20'],
    ['an empty value', ''],
    ['a plus-signed value', '+10'],
  ])('rejects %s as an invalid length rather than proxying it unrestricted', (_label, length) => {
    // Silently ignoring a length we cannot believe is how an unrestricted proxy
    // is reintroduced. The request is refused instead.
    expect(prepareRailsBody(requestWithLength(length)).kind).toBe('invalid-length');
  });

  it('cancels the body rather than reading it when it refuses a declared oversize', async () => {
    const request = requestWithLength(String(MAX_RAILS_REQUEST_BODY + 1));
    expect(prepareRailsBody(request).kind).toBe('too-large');
    // Disturbed by the cancel, never by a read: nothing was buffered, and the
    // client is not left uploading into a request that has already been refused.
    expect(request.bodyUsed).toBe(true);
    await expect(request.arrayBuffer()).rejects.toBeInstanceOf(Error);
  });
});

describe('prepareRailsBody bodyless requests', () => {
  it.each(['GET', 'HEAD'])('passes a bodyless %s through with a null body', (method) => {
    const result = prepareRailsBody(new Request(`${ORIGIN}/api/v0/x`, { method }));
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.body).toBeNull();
  });

  it('ignores a Content-Length on a request that carries no body at all', () => {
    const request = new Request(`${ORIGIN}/api/v0/x`, {
      method: 'GET',
      headers: { 'content-length': String(MAX_RAILS_REQUEST_BODY + 1) },
    });
    // Nothing can be sent, so nothing needs refusing — but the ceiling must not
    // be decided by a header on an empty request either way.
    expect(prepareRailsBody(request).kind).toBe('ok');
  });
});

describe('prepareRailsBody streaming ceiling', () => {
  it('relays a stream at the limit unchanged', async () => {
    const request = new Request(`${ORIGIN}/api/v0/things`, {
      method: 'POST',
      body: chunkedBody(MAX_RAILS_REQUEST_BODY),
      duplex: 'half',
    } as RequestInit);

    const result = prepareRailsBody(request);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok' || result.body === null) throw new Error('expected a body');

    await expect(drain(result.body)).resolves.toBe(MAX_RAILS_REQUEST_BODY);
    expect(result.state.exceeded).toBe(false);
  });

  it('errors the stream one byte past the limit, so no upstream can finish it', async () => {
    const request = new Request(`${ORIGIN}/api/v0/things`, {
      method: 'POST',
      body: chunkedBody(MAX_RAILS_REQUEST_BODY + 1),
      duplex: 'half',
    } as RequestInit);

    const result = prepareRailsBody(request);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok' || result.body === null) throw new Error('expected a body');

    await expect(drain(result.body)).rejects.toThrow('Rails proxy request body exceeded 8 MiB');
    expect(result.state.exceeded).toBe(true);
  });

  it('bounds an undeclared streaming body the same way', async () => {
    // No Content-Length at all: the byte counter is the only thing standing
    // between the upstream and an unbounded upload.
    const request = new Request(`${ORIGIN}/api/v0/things`, {
      method: 'POST',
      body: chunkedBody(MAX_RAILS_REQUEST_BODY * 2),
      duplex: 'half',
    } as RequestInit);

    const result = prepareRailsBody(request);
    if (result.kind !== 'ok' || result.body === null) throw new Error('expected a body');

    await expect(drain(result.body)).rejects.toThrow('Rails proxy request body exceeded 8 MiB');
    expect(result.state.exceeded).toBe(true);
  });

  it('catches a body that lies about its declared length', async () => {
    // `Content-Length: 10` with megabytes behind it. The declared length let it
    // past the cheap check; the counter is what actually holds the line.
    const headers = new Headers({ 'content-length': '10' });
    const request = new Request(`${ORIGIN}/api/v0/things`, {
      method: 'POST',
      headers,
      body: chunkedBody(MAX_RAILS_REQUEST_BODY + 65_536),
      duplex: 'half',
    } as RequestInit);

    const result = prepareRailsBody(request);
    if (result.kind !== 'ok' || result.body === null) throw new Error('expected a body');

    await expect(drain(result.body)).rejects.toThrow('Rails proxy request body exceeded 8 MiB');
    expect(result.state.exceeded).toBe(true);
  });

  it('never allocates the whole body: the counter is the only state it keeps', async () => {
    const request = new Request(`${ORIGIN}/api/v0/things`, {
      method: 'POST',
      body: chunkedBody(MAX_RAILS_REQUEST_BODY + 1),
      duplex: 'half',
    } as RequestInit);

    const result = prepareRailsBody(request);
    if (result.kind !== 'ok' || result.body === null) throw new Error('expected a body');

    const state: RailsBodyState = result.state;
    await drain(result.body).catch(() => undefined);
    // Bounded by one chunk past the ceiling, not by the size of the upload.
    expect(state.bytesRead).toBeLessThanOrEqual(MAX_RAILS_REQUEST_BODY + 65_536);
  });
});
