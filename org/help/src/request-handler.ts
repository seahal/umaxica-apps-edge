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
  const hostname = new URL(request.url).hostname;
  if (
    !isAllowedPublishingHost(hostname, {
      allowLocalhost: !isProductionPublishingEnvironment(bindings),
    })
  ) {
    return withSecurityHeaders(publishingHostRejectedResponse(), isProduction);
  }

  const nonce = isProduction ? createNonce() : undefined;
  const response = await withResponseGenerationTimeout(async (signal) => {
    if (!UNMETERED_PROBES.has(new URL(request.url).pathname)) {
      const limited = await checkRateLimit(request, bindings.RATE_LIMITER);
      if (limited) return limited;
    }

    const bounded = await limitRequestBody(request, signal);
    if (bounded.kind !== 'ok') {
      return bounded.kind === 'aborted'
        ? responseGenerationTimeoutResponse()
        : requestBoundaryResponse(bounded.kind);
    }

    return runWithNonce(nonce, () => routerFetch(bounded.request));
  }, responseGenerationTimeoutResponse);

  return withSecurityHeaders(applyPublishingStatus(response), isProduction, nonce);
}
