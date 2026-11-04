// @vitest-environment node
//
// Node's (undici) `Request` hands back the very stream it was given as `body`,
// which is what lets these cases control how that stream reads and cancels.
// `core-dispatch.test.ts` covers the ceiling end to end; this file covers the
// relay's defensive edges that no well-behaved runtime stream reaches.
import { describe, expect, it } from 'vitest';

import { RailsBodyTooLargeError, prepareRailsBody } from '../src/lib/rails-body-limit';

const FRAME = 'org/core';
const RAILS_URL = 'https://rails.example/api/v0/things';

interface SourceProbe {
  stream: ReadableStream<unknown>;
  readonly cancelled: number;
}

/** A still-open source that yields `chunks`, and whose own cancel always rejects. */
function unCancellableSource(chunks: readonly unknown[]): SourceProbe {
  let cancelled = 0;
  const queue = [...chunks];
  const stream = new ReadableStream<unknown>({
    pull(controller) {
      // Never closes: a closed stream cancels as a no-op, and these cases are
      // about the cancel the relay issues while the client is still sending.
      if (queue.length > 0) controller.enqueue(queue.shift());
    },
    cancel() {
      cancelled += 1;
      throw new Error('source cannot be cancelled');
    },
  });
  return {
    stream,
    get cancelled() {
      return cancelled;
    },
  };
}

function post(body: ReadableStream<unknown>, headers: Record<string, string> = {}): Request {
  return new Request(RAILS_URL, { method: 'POST', headers, body, duplex: 'half' } as RequestInit);
}

/** Lets the fire-and-forget `cancel().catch()` chains settle. */
async function settle(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function relayed(request: Request, maxBytes?: number): ReadableStream<Uint8Array> {
  const prepared = prepareRailsBody(request, maxBytes);
  if (prepared.kind !== 'ok' || prepared.body === null) {
    throw new Error(`expected a relayed body, got ${prepared.kind}`);
  }
  return prepared.body;
}

describe(`${FRAME} prepareRailsBody`, () => {
  it('refuses an oversized declared length even when the source refuses to cancel', async () => {
    const source = unCancellableSource([new Uint8Array(1)]);

    expect(prepareRailsBody(post(source.stream, { 'content-length': '11' }), 10)).toEqual({
      kind: 'too-large',
    });
    await settle();
    expect(source.cancelled).toBe(1);
  });

  it('errors the relay when the source yields something other than bytes', async () => {
    const source = unCancellableSource(['not bytes']);

    const reader = relayed(post(source.stream)).getReader();

    await expect(reader.read()).rejects.toBeInstanceOf(RailsBodyTooLargeError);
    await settle();
    expect(source.cancelled).toBe(1);
  });

  it('errors the relay past the ceiling even when the source refuses to cancel', async () => {
    const source = unCancellableSource([new Uint8Array(6), new Uint8Array(6)]);

    const reader = relayed(post(source.stream), 10).getReader();

    await expect(reader.read()).resolves.toMatchObject({ done: false });
    await expect(reader.read()).rejects.toThrow('Rails proxy request body exceeded 8 MiB');
    await settle();
    expect(source.cancelled).toBe(1);
  });

  it('passes a consumer cancel through to the source', async () => {
    const source = unCancellableSource([new Uint8Array(1)]);

    await relayed(post(source.stream)).cancel('upstream gone');
    await settle();

    expect(source.cancelled).toBe(1);
  });
});
