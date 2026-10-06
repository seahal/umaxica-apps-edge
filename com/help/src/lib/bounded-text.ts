/**
 * Reads a response body as UTF-8 while enforcing a byte limit.
 *
 * The reader is attached directly to the response body. A `Response.clone()`
 * creates a tee, and cancelling only one branch can leave the other branch
 * pending indefinitely in some runtimes. Callers give this helper a response
 * whose body they no longer need, so a direct reader keeps ownership explicit.
 *
 * The optional signal is the same signal used for the fetch. It remains active
 * while the body is being read, so receiving headers does not end the request's
 * timeout window. Cancellation is started without awaiting an upstream
 * cancellation promise; a broken or slow source must not turn cleanup into a
 * second hang.
 */
export async function readBoundedText(
  response: Response,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError('maxBytes must be a non-negative integer');
  }

  // workers-types exposes Response.body without a concrete byte type. The
  // Fetch body contract is bytes, and this assertion is guarded by the null
  // check before the generic reader is used.
  const body = response.body as ReadableStream<Uint8Array> | null;
  if (body === null) {
    return '';
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytesRead = 0;
  let complete = false;
  let done = false;

  const readChunk = async () => {
    if (signal === undefined) {
      return reader.read();
    }
    if (signal.aborted) {
      throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
    }

    let rejectAbort!: (reason?: unknown) => void;
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = reject;
    });
    const onAbort = () => {
      rejectAbort(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      return await Promise.race([reader.read(), aborted]);
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  };

  try {
    while (!done) {
      const result = await readChunk();
      if (result.done) {
        done = true;
        complete = true;
        continue;
      }

      const { value } = result;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        throw new RangeError('response body exceeds byte limit');
      }
      parts.push(decoder.decode(value, { stream: true }));
    }

    parts.push(decoder.decode());
    return parts.join('').trim();
  } finally {
    if (!complete) {
      try {
        void reader.cancel().catch(() => undefined);
      } catch {
        // The body may already have failed or been cancelled by its source.
      }
    }
    try {
      reader.releaseLock();
    } catch {
      // A read still pending during abort owns the lock until the source settles.
    }
  }
}
