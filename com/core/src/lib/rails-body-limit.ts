/**
 * The hard ceiling on a Rails-owned proxied request body.
 *
 * The Rails branch of `worker.ts` deliberately skips the application body limit
 * in `request-boundary.ts` so mutations stay a transparent streamed relay — which
 * left the Rails surface as the one path with no ceiling at all. This module
 * restores one without giving up the streaming: nothing here buffers a body.
 *
 * Two mechanisms, because either alone is insufficient:
 *
 *   1. A declared `Content-Length` over the ceiling is refused before a single
 *      byte is read. This is the cheap case and covers every honest client.
 *   2. Every byte that does flow is counted as it passes. Past the ceiling the
 *      relayed stream is ERRORED, not truncated — so the upstream sees a broken
 *      request body and cannot complete an oversized request as a normal one. A
 *      `Content-Length` that lies, a chunked body that declares nothing, and a
 *      `Transfer-Encoding` the runtime rewrote all land here.
 *
 * `Content-Length` is therefore never the security boundary; it is only the
 * early exit. A length that cannot be believed at all — negative, non-numeric,
 * a duplicated list — is refused outright rather than ignored, because ignoring
 * it is how an unrestricted proxy gets reintroduced by accident.
 *
 * Memory stays bounded by one source chunk regardless of upload size: the
 * counter is the only state kept, and `request.arrayBuffer()` is never called.
 */

/** 8 MiB. Generous for every current Rails surface; sized to bound blast radius, not to be tight. */
export const MAX_RAILS_REQUEST_BODY = 8 * 1024 * 1024;

/** Observable by the dispatcher after the relay, so an exceeded body becomes a 413 rather than a 502. */
export interface RailsBodyState {
  exceeded: boolean;
  bytesRead: number;
}

export type RailsBodyResult =
  | { kind: 'ok'; body: ReadableStream<Uint8Array> | null; state: RailsBodyState }
  | { kind: 'too-large' }
  | { kind: 'invalid-length' };

export class RailsBodyTooLargeError extends Error {
  override readonly name = 'RailsBodyTooLargeError';
}

type DeclaredLength = { kind: 'absent' } | { kind: 'invalid' } | { kind: 'length'; value: number };

/**
 * Reads `Content-Length` without trusting it.
 *
 * `Number.isSafeInteger` is the boundary between "a length" and "a number so
 * large it can only be an attack or a bug"; both are over the ceiling, so both
 * are refused, but only the well-formed one is called a length.
 */
function declaredLength(raw: string | null): DeclaredLength {
  if (raw === null) return { kind: 'absent' };
  const value = raw.trim();
  if (value.length === 0) return { kind: 'invalid' };
  if (!/^\d+$/u.test(value)) return { kind: 'invalid' };
  const length = Number(value);
  // A digit string too long to be a safe integer is not a believable length,
  // but it is unambiguously over the ceiling, so it is refused as oversize.
  return {
    kind: 'length',
    value: Number.isSafeInteger(length) ? length : Number.POSITIVE_INFINITY,
  };
}

function cancel(stream: ReadableStream<unknown>, reason?: unknown): void {
  void stream.cancel(reason).catch(() => undefined);
}

/**
 * Wraps `source` in a stream that carries at most `maxBytes` and then fails.
 *
 * Written as a pull-driven `ReadableStream` over a reader rather than a
 * `TransformStream` pipe: a `pipeThrough` on a half-duplex request body is the
 * construct whose behaviour differs between workerd and undici, and this relay
 * has to behave identically in production and under Vitest. A `pull` that reads
 * one chunk and enqueues one chunk has the same semantics in both, and gives the
 * backpressure the relay needs for free — the source is read only as fast as the
 * upstream consumes it.
 */
function boundedStream(
  source: ReadableStream<unknown>,
  maxBytes: number,
  state: RailsBodyState,
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const result = await reader.read();
      if (result.done) {
        controller.close();
        return;
      }
      const chunk: unknown = result.value;
      if (!(chunk instanceof Uint8Array)) {
        // A request body stream that yields anything else is not a body this
        // relay can account for, so it is not one it will forward.
        void reader.cancel().catch(() => undefined);
        controller.error(new RailsBodyTooLargeError('Rails proxy request body was not bytes'));
        return;
      }
      state.bytesRead += chunk.byteLength;
      if (state.bytesRead > maxBytes) {
        state.exceeded = true;
        // Stop reading the client, and break the relay. An upstream that has
        // already received part of this body gets an errored stream, never a
        // silently truncated one it could mistake for a complete request.
        void reader.cancel().catch(() => undefined);
        controller.error(new RailsBodyTooLargeError('Rails proxy request body exceeded 8 MiB'));
        return;
      }
      controller.enqueue(chunk);
    },
    cancel(reason) {
      void reader.cancel(reason).catch(() => undefined);
    },
  });
}

/**
 * The body to relay to Rails, or the reason the request is refused.
 *
 * Synchronous on purpose: the decision costs a header read, and the bytes are
 * not touched until the upstream pulls them.
 */
export function prepareRailsBody(
  request: Request,
  maxBytes = MAX_RAILS_REQUEST_BODY,
): RailsBodyResult {
  const state: RailsBodyState = { exceeded: false, bytesRead: 0 };
  const body: ReadableStream<unknown> | null = request.body;

  const declared = declaredLength(request.headers.get('content-length'));

  if (body === null) {
    // Nothing can be sent, so a header about its size decides nothing.
    return { kind: 'ok', body: null, state };
  }

  if (declared.kind === 'invalid') {
    cancel(body);
    return { kind: 'invalid-length' };
  }
  if (declared.kind === 'length' && declared.value > maxBytes) {
    cancel(body);
    return { kind: 'too-large' };
  }

  return { kind: 'ok', body: boundedStream(body, maxBytes, state), state };
}
