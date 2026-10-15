/** Maximum body size for an Edge-owned JSON, form or Server Function request. */
export const EDGE_INPUT_MAX_BYTES = 65_536;

export type RequestBoundaryResult =
  | { kind: 'ok'; request: Request }
  | { kind: 'too-large' }
  | { kind: 'unsupported-encoding' }
  | { kind: 'invalid-body' }
  | { kind: 'aborted' };

function cancelBody(body: ReadableStream<unknown>, reason?: unknown): void {
  void body.cancel(reason).catch(() => undefined);
}

function cancelReader(reader: ReadableStreamDefaultReader<unknown>, reason?: unknown): void {
  void reader.cancel(reason).catch(() => undefined);
}

function declaredLength(value: string | null): number | null {
  if (value === null || !/^\d+$/u.test(value.trim())) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) ? length : Number.POSITIVE_INFINITY;
}

function requestInit(request: Request, signal?: AbortSignal): RequestInit {
  return {
    cache: request.cache,
    credentials: request.credentials,
    headers: new Headers(request.headers),
    integrity: request.integrity,
    keepalive: request.keepalive,
    method: request.method,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    ...(signal === undefined ? {} : { signal }),
  };
}

function requestWithBody(request: Request, body: ArrayBuffer, signal?: AbortSignal): Request {
  const init = {
    ...requestInit(request, signal),
    body,
    duplex: 'half' as const,
  };
  return new Request(request.url, init);
}

/**
 * Reads at most maxBytes plus one byte before handing the request to the
 * framework. The captured bytes are put back into a new Request so the
 * parser never receives an already-consumed body.
 */
export async function limitRequestBody(
  request: Request,
  signal?: AbortSignal,
  maxBytes = EDGE_INPUT_MAX_BYTES,
): Promise<RequestBoundaryResult> {
  if (signal?.aborted) return { kind: 'aborted' };

  const contentEncoding = request.headers.get('content-encoding');
  if (contentEncoding !== null && contentEncoding.trim().toLowerCase() !== 'identity') {
    if (request.body !== null) cancelBody(request.body);
    return { kind: 'unsupported-encoding' };
  }

  const body = request.body;
  if (body === null) {
    return {
      kind: 'ok',
      request:
        signal === undefined ? request : new Request(request.url, requestInit(request, signal)),
    };
  }

  const length = declaredLength(request.headers.get('content-length'));
  if (length !== null && length > maxBytes) {
    cancelBody(body);
    return { kind: 'too-large' };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const abort = () => cancelReader(reader, signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });

  try {
    for (;;) {
      if (signal?.aborted) return { kind: 'aborted' };
      const readResult = await reader.read();
      if (readResult.done) break;
      const value: unknown = readResult.value;
      if (!(value instanceof Uint8Array)) return { kind: 'invalid-body' };
      const chunk = value;
      total += chunk.byteLength;
      if (total > maxBytes) {
        cancelReader(reader);
        return { kind: 'too-large' };
      }
      chunks.push(chunk);
    }
  } catch {
    return signal?.aborted ? { kind: 'aborted' } : { kind: 'invalid-body' };
  } finally {
    signal?.removeEventListener('abort', abort);
    reader.releaseLock();
  }

  const bytes = new ArrayBuffer(total);
  const view = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { kind: 'ok', request: requestWithBody(request, bytes, signal) };
  } catch {
    return { kind: 'invalid-body' };
  }
}

export type RequestBoundaryError = Extract<
  RequestBoundaryResult,
  { kind: 'too-large' | 'unsupported-encoding' | 'invalid-body' }
>['kind'];

export function requestBoundaryResponse(kind: RequestBoundaryError): Response {
  const responseByKind: Record<RequestBoundaryError, [number, string]> = {
    'too-large': [413, 'Payload Too Large\n'],
    'unsupported-encoding': [415, 'Unsupported Media Type\n'],
    'invalid-body': [400, 'Bad Request\n'],
  };
  const [status, body] = responseByKind[kind];
  return new Response(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
