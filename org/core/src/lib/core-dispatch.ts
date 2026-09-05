/**
 * Shared-FQDN Core dispatch for `jp.umaxica.org`.
 *
 * This is the browser-facing counterpart to `rails-client.ts` /
 * `rails-health.ts`, which stay untouched server-to-server health-check
 * clients (see `adr/007-shared-fqdn-core-dispatch.md`). This module is
 * deliberately separate: it forwards the browser's own `Cookie`/CSRF/auth
 * headers to Rails verbatim, which is the opposite of what
 * `rails-client.ts`'s header strip does and must keep doing for its own
 * caller.
 *
 * Consumed only by `src/worker.ts`, which is the first code the Workers
 * runtime invokes for every request — before any application code runs.
 */
import { withSecurityHeaders } from '../security-headers';
import { readBoundedText } from './bounded-text';
import {
  classifyRailsRouteClass,
  logRailsDispatch,
  normalizeProxyErrorCode,
  normalizeRailsMethod,
} from './rails-dispatch-log';

/**
 * The public, browser-facing hostname for this app's Core frame. Used as the
 * literal origin of the outbound Rails request — not just a header value.
 *
 * Per the Cloudflare Workers VPC binding docs (`fetch()` on a VPC-bound
 * `Fetcher`): "The host provided in fetch() does not control routing. It
 * only populates the Host header and, when using https, the SNI value" —
 * routing is entirely determined by the binding's `service_id`
 * (`UMAXICA_APPS_EDGE_CF_WORKERS_VPC`, see `wrangler.jsonc`). So building the
 * request against this public origin costs nothing on routing correctness,
 * and satisfies Rails' Host Authorization, which expects a public host.
 *
 * `Host` is deliberately NOT set by mutating a `Headers` object: `host` is a
 * forbidden header name under the Fetch standard and silently fails to set
 * on a `Request` (confirmed against Fetch spec / runtime `Headers`
 * behavior). Driving it through the request URL itself is the only reliable
 * way to control it, in both a Workers runtime and this file's own tests.
 */
const PUBLIC_CORE_HOST = 'jp.umaxica.org';
const PUBLIC_CORE_ORIGIN = `https://${PUBLIC_CORE_HOST}`;

export type PathOwnership = 'rails' | 'blocked' | 'next';

/*
 * WHERE THIS TABLE COMES FROM, AND WHERE IT INTENTIONALLY DISAGREES WITH RAILS.
 *
 * The Rails route list it is reconciled against was supplied to the mission
 * directly; this repository still cannot read `config/routes/core.rb`, and the
 * Rails repository is not checked out alongside it. So the table is authoritative
 * about what Edge does and second-hand about what Rails serves. Reconcile with
 * `bin/rails routes` from the Rails repository when that is available.
 *
 * Several paths exist on BOTH sides. Edge keeps them anyway. These are
 * intentional overrides, not gaps in the audit:
 *
 *   /health/*     Rails serves JSON probes here. BLOCKED at the edge except the
 *                 three Edge text/plain probes (`/health/startups`,
 *                 `/health/livenesses`, `/health/readinesses`). Rails-internal
 *                 JSON (`/health/liveness.json` and siblings) stays off the
 *                 public FQDN.
 *   /api/v0/health.json  Rails serves a Health API here. NEXT anyway: Edge
 *                 self-health for this Worker.
 *   /api/v0/revision.json  Edge Workers version metadata. NEXT. Other `/api/v0/*`
 *                 stay Rails.
 *   /health       Rails serves it. NEXT anyway: Edge's human-readable aggregate.
 *   /robots.txt   Rails serves it. NEXT: Edge owns the crawler contract for the
 *                 public FQDN (`src/app/robots.ts`).
 *   /sitemap.xml  Rails serves it. NEXT, same reason (`src/app/sitemap.ts`).
 *   /configuration  Present on BOTH sides for `org`. Left NEXT — a known
 *                 collision, recorded rather than resolved. Do not reassign it
 *                 without deciding the ownership question first. See ADR 009.
 *
 * Full reasoning: `adr/009-rails-health-entrypoint-and-dispatch-operability.md`.
 */

// Prefix match unless noted otherwise.
const RAILS_OWNED_PREFIXES = ['/api/v0/', '/web/v0/', '/edge/v0/', '/oidc/'];

// Exact match only.
const RAILS_OWNED_EXACT = new Set([
  '/sign/out',
  '/sign/out/complete',
  '/.well-known/jwks.json',
  '/csp-violation-report',
]);

/*
 * Blocked at the edge: reachable by neither Rails nor the application.
 *
 * Deliberately scoped to `/health/` WITH a further path segment, and matched by
 * a raw `startsWith` rather than by `matchesPrefix()` below. That asymmetry is
 * load-bearing: it is what lets the exact path `/health` fall through to the
 * APPLICATION. The three Kubernetes probes are an allow-list under that prefix;
 * every other `/health/…` path, including Rails' `*.json` probes, still 404s
 * before either Rails or the application is invoked.
 */
const BLOCKED_PREFIX = '/health/';

const APPLICATION_HEALTH_PROBES = new Set([
  '/health/startups',
  '/health/livenesses',
  '/health/readinesses',
]);

/*
 * Matches `rails-client.ts`'s `RAILS_FETCH_TIMEOUT_MS`, deliberately — one Rails
 * timeout budget for this frame, whichever direction the call comes from.
 * `test/core-dispatch-contract.test.ts` pins the two together.
 */
const RAILS_DISPATCH_TIMEOUT_MS = 5000;

/*
 * Long enough for `ProxyError: <code>`, short enough that a real Rails error
 * page is never pulled into memory just to be classified — a bound
 * `readBoundedText` now actually enforces, rather than one applied after the
 * whole body was already read. Mirrors the constant of the same name in
 * `rails-client.ts`.
 */
const PROXY_ERROR_MAX_CHARS = 200;

function matchesPrefix(pathname: string, prefix: string): boolean {
  const withoutTrailingSlash = prefix.slice(0, -1);
  return pathname === withoutTrailingSlash || pathname.startsWith(prefix);
}

const EDGE_SELF_HEALTH_API = '/api/v0/health.json';
const EDGE_REVISION_API = '/api/v0/revision.json';

export function classifyCorePath(pathname: string): PathOwnership {
  if (pathname.startsWith(BLOCKED_PREFIX)) {
    return APPLICATION_HEALTH_PROBES.has(pathname) ? 'next' : 'blocked';
  }
  /*
   * Edge self-health is machine JSON for THIS Worker. The rest of `/api/v0/`
   * stays Rails-owned (ADR 007). Rails publishes the same path on its origin;
   * that document is consumed privately by `rails-health.ts`, never here.
   */
  if (pathname === EDGE_SELF_HEALTH_API || pathname === EDGE_REVISION_API) {
    return 'next';
  }
  if (RAILS_OWNED_EXACT.has(pathname)) {
    return 'rails';
  }
  if (RAILS_OWNED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return 'rails';
  }
  return 'next';
}

export function blockedCoreResponse(): Response {
  return new Response(null, {
    status: 404,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

/**
 * The only body a failed dispatch is allowed to carry: a fixed string chosen
 * from two literals.
 *
 * No exception message, no `ProxyError` code, no private hostname and no VPC
 * service id ever reaches the browser. The specific cause goes to Workers Logs
 * through `logRailsDispatch()` instead, where it is not attacker-visible.
 */
function railsUnavailableResponse(
  reason: 'not-configured' | 'upstream',
  isProduction: boolean,
): Response {
  // Fail closed, visibly — same principle as `getRailsClient()` returning
  // `null`. Never falls through to the application, never silently succeeds against
  // a dev resource in production.
  const body =
    reason === 'not-configured' ? 'Rails transport not configured' : 'Rails upstream unavailable';

  // `Content-Type` is stated rather than left off. A body with no declared type
  // is a body the browser is free to sniff, and this one is served on the same
  // origin as the application — the `nosniff` that `withSecurityHeaders` adds is
  // only meaningful next to a type to pin it to.
  //
  // This document is Edge's, not Rails', which is why it takes Edge's headers
  // while a real Rails response passes through untouched.
  return withSecurityHeaders(
    new Response(body, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }),
    isProduction,
  );
}

/**
 * True for both an `AbortSignal.timeout()` firing (`TimeoutError`) and an
 * explicit abort (`AbortError`).
 *
 * Tested by `name` rather than `instanceof DOMException`: the two runtimes this
 * code has to satisfy — workerd in production, undici under Vitest — do not
 * agree on the identity of that constructor, and the name is stable in both.
 */
function isTimeoutError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) return false;
  const name: unknown = error.name;
  return name === 'TimeoutError' || name === 'AbortError';
}

/**
 * The `ProxyError: <code>` Workers VPC answers with when it cannot reach the
 * private origin, or null for any other response.
 *
 * Workers VPC does NOT throw when the origin is unreachable — measured
 * 2026-08-09 by stopping Rails, and recorded at the matching function in
 * `rails-client.ts`. It answers an ordinary HTTP 500 whose body carries the
 * documented code:
 *
 *   500  text/plain  "ProxyError: connection_refused"
 *
 * Passing that through would present the most common real failure — Rails being
 * down — to the browser as a Rails-authored 500, indistinguishable from Rails
 * returning 500 from its own code. So it is claimed here and answered 503.
 *
 * Deliberately narrow, and deliberately only on a failing response: a 500 with a
 * `text/plain` body is the only thing inspected, the read is bounded, and it
 * happens on a clone so a genuine Rails 500 is still returned with its body
 * intact. Nothing on the success path touches the body at all.
 */
async function readProxyErrorCode(response: Response): Promise<string | null> {
  if (response.status !== 500) {
    return null;
  }
  if (!response.headers.get('content-type')?.startsWith('text/plain')) {
    return null;
  }

  try {
    const body = await readBoundedText(response.clone(), PROXY_ERROR_MAX_CHARS);
    return /^ProxyError:\s*(\w+)/iu.exec(body)?.[1] ?? null;
  } catch {
    // A body that cannot be read is not evidence of anything; leave the
    // response to be passed through as the Rails error it appears to be.
    return null;
  }
}

/**
 * Builds the outbound Rails request for a browser-facing, Rails-owned path.
 *
 * Preserves method, path, query, body (streamed, not buffered), and every
 * header the browser sent — Cookie, Origin, Referer, CSRF headers,
 * content-type, accept, user-agent, conditional/cache headers — verbatim.
 *
 * `Host` is the PUBLIC Core hostname — not a VPC routing label, and not
 * `X-Forwarded-Host` (deliberately absent). The VPC binding's `fetch()`
 * routes entirely by `service_id`, so building the request against the
 * public origin does not affect routing, and satisfies Rails' Host
 * Authorization expectation of a public host.
 */
function buildRailsRequest(request: Request, incomingUrl: URL): Request {
  const target = new URL(incomingUrl.pathname + incomingUrl.search, PUBLIC_CORE_ORIGIN);
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name === 'forwarded' || name === 'x-real-ip' || name.startsWith('x-forwarded-')) {
      headers.delete(name);
    }
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && request.body !== null;

  return new Request(target, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
    // Carried on the Request rather than passed as a second argument to
    // `binding.fetch()`: an init object makes the runtime rebuild the Request,
    // and rebuilding one whose body is a half-duplex stream is exactly what
    // this dispatch must not do. `fetch()` honours `request.signal`.
    signal: AbortSignal.timeout(RAILS_DISPATCH_TIMEOUT_MS),
    ...(hasBody ? ({ duplex: 'half' } as { duplex: 'half' }) : {}),
  });
}

/**
 * Dispatches a Rails-owned browser request over the Workers VPC binding.
 *
 * Never calls into the application — not on success and not on any failure.
 * When Rails answers, its response is returned unchanged (status, `Location`,
 * `Set-Cookie`, body, content-type, cache headers), including a 404, a 405 or a
 * 500 of its own making.
 *
 * The four ways this can fail all answer 503 and are distinguished only in the
 * log: no binding, a thrown `fetch`, a timeout, and the `ProxyError` 500 Workers
 * VPC returns instead of throwing. There is exactly one `binding.fetch()` call
 * and no retry loop, for mutations as much as for reads — a retried POST that
 * timed out is a second mutation, not a second chance.
 */
export async function dispatchToRails(
  request: Request,
  env: Pick<CloudflareEnv, 'UMAXICA_APPS_EDGE_CF_WORKERS_VPC'>,
  isProduction: boolean,
): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const routeClass = classifyRailsRouteClass(incomingUrl.pathname);
  const method = normalizeRailsMethod(request.method);
  const startedAt = Date.now();

  const binding = env.UMAXICA_APPS_EDGE_CF_WORKERS_VPC;
  if (!binding) {
    logRailsDispatch({
      route_class: routeClass,
      method,
      outcome: 'binding_not_configured',
      duration_ms: Date.now() - startedAt,
    });
    return railsUnavailableResponse('not-configured', isProduction);
  }

  const railsRequest = buildRailsRequest(request, incomingUrl);

  let response: Response;
  try {
    response = await binding.fetch(railsRequest);
  } catch (error) {
    logRailsDispatch({
      route_class: routeClass,
      method,
      outcome: isTimeoutError(error) ? 'timeout' : 'vpc_unreachable',
      duration_ms: Date.now() - startedAt,
    });
    return railsUnavailableResponse('upstream', isProduction);
  }

  const proxyErrorCode = await readProxyErrorCode(response);
  if (proxyErrorCode !== null) {
    logRailsDispatch({
      route_class: routeClass,
      method,
      outcome: 'vpc_unreachable',
      duration_ms: Date.now() - startedAt,
      upstream_status: response.status,
      proxy_error_code: normalizeProxyErrorCode(proxyErrorCode),
    });
    return railsUnavailableResponse('upstream', isProduction);
  }

  logRailsDispatch({
    route_class: routeClass,
    method,
    // 3xx counts as Rails answering normally — `/sign/out` and `/oidc/callback`
    // both redirect on their happy path.
    outcome: response.status < 400 ? 'rails_ok' : 'rails_http_error',
    duration_ms: Date.now() - startedAt,
    upstream_status: response.status,
  });
  return response;
}
