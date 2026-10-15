/** Edge application response-generation budget, distinct from upstream I/O. */
export const EDGE_RESPONSE_TIMEOUT_MS = 3_000;

/**
 * `local` is `vite dev`, where the first request to a route pays for an
 * on-demand compile. On a small CI runner that alone exceeds the production
 * budget, so `pnpm test:api` saw 503s that no deployed Worker would produce.
 */
export const LOCAL_RESPONSE_TIMEOUT_MS = 60_000;

export function responseGenerationBudgetMs(environment: string): number {
  return environment === 'local' ? LOCAL_RESPONSE_TIMEOUT_MS : EDGE_RESPONSE_TIMEOUT_MS;
}

export function responseGenerationTimeoutResponse(): Response {
  return new Response('Service Unavailable\n', {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

/**
 * Bounds the operation and aborts the operation signal when the budget ends.
 * The operation's settlement handler remains attached after a timeout so a
 * late rejection cannot become an unhandled promise.
 */
export async function withResponseGenerationTimeout<T>(
  operation: (signal: AbortSignal) => T | Promise<T>,
  onTimeout: () => T,
  timeoutMs: number = EDGE_RESPONSE_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const operationPromise = Promise.resolve().then(() => operation(controller.signal));

  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new DOMException('response generation timed out', 'TimeoutError'));
        try {
          resolve(onTimeout());
        } catch (error) {
          reject(error);
        }
      }, timeoutMs);

      void operationPromise.then(
        (value) => {
          if (!timedOut) resolve(value);
          return undefined;
        },
        (error: unknown) => {
          reject(error);
          return undefined;
        },
      );
    });
  } finally {
    // Timer is assigned synchronously in the Promise executor before any await.
    clearTimeout(timer);
  }
}
