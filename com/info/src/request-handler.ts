import { getEdgeBindings } from './lib/env';
import {
  isAllowedPublishingHost,
  isProductionPublishingEnvironment,
  publishingHostRejectedResponse,
} from './lib/publishing-host-policy';
import { applyPublishingStatus } from './lib/publishing-status';
import { checkRateLimit } from './lib/rate-limit';
import { limitRequestBody, requestBoundaryResponse } from './lib/request-boundary';
import {
  classifyEdgeRoute,
  createRequestId,
  logEdgeRequest,
  normalizeEdgeEnvironment,
  normalizeEdgeMethod,
  outcomeForStatus,
  runWithRequestId,
  withRequestId,
  withRequestIdRequest,
} from './lib/request-log';
import {
  responseGenerationTimeoutResponse,
  withResponseGenerationTimeout,
} from './lib/response-timeout';
import { withSecurityHeaders } from './security-headers';
import { createNonce, runWithNonce } from './security-nonce';

/*
 * Everything this unit does around the router, in a function that takes the
 * router as an argument.
 *
 * `src/server.ts` is the wiring that hands it TanStack's fetch handler; keeping
 * the behaviour here is what makes the request boundary testable without
 * resolving `@tanstack/react-start/server-entry`, which only the Worker build
 * can resolve.
 *
 * Order is the contract:
 *
 * 1. The public Host boundary rejects an unknown hostname before the limiter
 *    or router runs. Then first touch (adr/010) makes the rate limiter answer
 *    before the router runs at all. The three constant probes are exempt — a
 *    429 on one of them is indistinguishable from a dead isolate.
 *    `/health` and `/health/readinesses` are NOT exempt: both reach Rails, and
 *    an uncounted path into Rails is what the limiter exists to prevent. The
 *    same three paths are the exempt set in every Core `src/worker.ts` and
 *    every apex `create-apex-app.ts`.
 * 2. The application response gets one 3-second budget. Its signal is passed
 *    to the bounded body reader so a timeout does not leave that reader alive.
 * 3. One CSP nonce per production request, published to `getRouter()` so
 *    TanStack stamps it on its inline hydration script, and named in the policy.
 * 4. A Publishing failure status is moved onto the status line
 *    (`src/lib/publishing-status.ts`).
 * 5. The security headers land on whatever comes back — including the 404 and
 *    500 documents the router produces, and the 429 above.
 *
 * Static assets never reach here: Cloudflare matches them before the Worker
 * runs, and `public/_headers` covers them.
 */
const UNMETERED_PROBES = new Set(['/health/startups', '/health/livenesses', '/api/v0/health.json']);

export async function handleRequest(
  request: Request,
  // Widened to what TanStack's handler actually is — it may answer synchronously
  // — rather than narrowed at the call site with an assertion.
  routerFetch: (request: Request) => Response | Promise<Response>,
  isProduction: boolean,
): Promise<Response> {
  const bindings = getEdgeBindings();
  const url = new URL(request.url);
  const requestId = createRequestId();
  const startedAt = Date.now();
  const route = classifyEdgeRoute(url.pathname);
  const method = normalizeEdgeMethod(request.method);
  const environment = normalizeEdgeEnvironment(bindings.EDGE_ENV);
  let timedOut = false;

  const finish = (response: Response, outcome = outcomeForStatus(response.status)): Response => {
    const finalResponse = withRequestId(response, requestId);
    logEdgeRequest({
      service: 'public',
      environment,
      request_id: requestId,
      method,
      route,
      status: finalResponse.status,
      duration_ms: Date.now() - startedAt,
      outcome,
    });
    return finalResponse;
  };

  try {
    if (
      !isAllowedPublishingHost(url.hostname, {
        allowLocalhost: !isProductionPublishingEnvironment(bindings),
      })
    ) {
      return finish(
        withSecurityHeaders(publishingHostRejectedResponse(), isProduction),
        'rejected',
      );
    }

    const nonce = isProduction ? createNonce() : undefined;
    const response = await runWithRequestId(requestId, () =>
      withResponseGenerationTimeout(
        async (signal) => {
          if (!UNMETERED_PROBES.has(url.pathname)) {
            const limited = await checkRateLimit(request, bindings.RATE_LIMITER);
            if (limited) return limited;
          }

          const bounded = await limitRequestBody(request, signal);
          if (bounded.kind !== 'ok') {
            return bounded.kind === 'aborted'
              ? responseGenerationTimeoutResponse()
              : requestBoundaryResponse(bounded.kind);
          }

          return runWithNonce(nonce, () =>
            routerFetch(withRequestIdRequest(bounded.request, requestId)),
          );
        },
        () => {
          timedOut = true;
          return responseGenerationTimeoutResponse();
        },
      ),
    );

    return finish(
      withSecurityHeaders(applyPublishingStatus(response), isProduction, nonce),
      timedOut ? 'timeout' : undefined,
    );
  } catch {
    return finish(
      withSecurityHeaders(
        new Response('Internal Server Error\n', {
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        }),
        isProduction,
      ),
      'failed',
    );
  }
}
