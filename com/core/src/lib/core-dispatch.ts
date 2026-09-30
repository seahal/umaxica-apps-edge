/**
 * Shared-FQDN Core dispatch for `jp.umaxica.com`.
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
import { canonicalizeClientIdentity, readClientIp } from './client-ip';
import { prepareRailsBody } from './rails-body-limit';
import {
  classifyRailsRouteClass,
  logRailsDispatch,
  normalizeRailsMethod,
} from './rails-dispatch-log';
import { parseRailsOrigin } from './rails-origin';
import { normalizeEdgeEnvironment } from './request-log';

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

/*
 * Exact match only — an allow-list, never a prefix.
 *
 * The logout pair is listed in both its bare and its trailing-slash spelling
 * because a browser reaches either one and both must log the user out. Before
 * this, `/sign/out/` fell through to the APPLICATION, which renders a page and
 * cannot clear a Rails session: a user who opened the trailing-slash URL was
 * shown something plausible while their session cookie survived.
 *
 * Deliberately NOT `startsWith('/sign/out')`. That would hand Rails
 * `/sign/outside`, and every future `/sign/out/<anything>` Rails does not serve,
 * turning an ownership table into a wildcard. Four literals is the whole fix.
 *
 * The other two entries keep their single canonical spelling: no trailing-slash
 * alias is added for `/.well-known/jwks.json` or `/csp-violation-report`,
 * because neither is a URL a human types or a browser rewrites.
 */
const RAILS_OWNED_EXACT = new Set([
  '/sign/out',
  '/sign/out/',
  '/sign/out/complete',
  '/sign/out/complete/',
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
const RAILS_DISPATCH_TIMEOUT_MS = 2000;

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
 * from three literals.
 *
 * No exception message and no Rails hostname ever reaches the browser. The
 * specific cause goes to Workers Logs through `logRailsDispatch()` instead,
 * where it is not attacker-visible.
 */
function railsUnavailableResponse(
  reason: 'not-configured' | 'upstream' | 'timeout',
  isProduction: boolean,
): Response {
  // Fail closed, visibly — same principle as `getRailsClient()` returning
  // `null`. Never falls through to the application, never silently succeeds against
  // a dev resource in production.
  const body =
    reason === 'not-configured'
      ? 'Rails transport not configured'
      : reason === 'timeout'
        ? 'Rails upstream timeout'
        : 'Rails upstream unavailable';

  // `Content-Type` is stated rather than left off. A body with no declared type
  // is a body the browser is free to sniff, and this one is served on the same
  // origin as the application — the `nosniff` that `withSecurityHeaders` adds is
  // only meaningful next to a type to pin it to.
  //
  // This document is Edge's, not Rails', which is why it takes Edge's headers
  // while a real Rails response passes through untouched.
  return withSecurityHeaders(
    new Response(body, {
      status: reason === 'timeout' ? 504 : 503,
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
 * Why a Rails-owned request was refused before it reached Rails. Both are the
 * request's own fault, so both answer 4xx rather than the 5xx family above.
 */
type RailsBodyRefusal = 'too-large' | 'invalid-length';

/**
 * Edge's own document for a body Edge would not relay.
 *
 * `413` for a body over `MAX_RAILS_REQUEST_BODY`, `400` for a `Content-Length`
 * Edge could not believe. Neither echoes the declared length back, and neither
 * names Rails: the request never reached it.
 */
function railsBodyRefusedResponse(reason: RailsBodyRefusal, isProduction: boolean): Response {
  const [status, body] =
    reason === 'too-large' ? [413, 'Payload Too Large\n'] : [400, 'Bad Request\n'];

  return withSecurityHeaders(
    new Response(body, {
      status,
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
 * Builds the outbound Rails request for a browser-facing, Rails-owned path.
 *
 * Preserves method, path, query, body (streamed, not buffered), and every
 * header the browser sent — Cookie, Origin, Referer, CSRF headers,
 * content-type, accept, user-agent, conditional/cache headers — verbatim.
 *
 * The request is built against `RAILS_ORIGIN`, so `Host` is the Rails host.
 * `host` is a forbidden header name under the Fetch standard, so the URL is the
 * only thing that can set it.
 *
 * Client identity is CANONICALIZED rather than filtered: every caller-supplied
 * proxy header is removed and a single `X-Forwarded-For` is regenerated from the
 * validated `CF-Connecting-IP`. See `./client-ip.ts` for why a deny list is the
 * wrong shape for this. The remaining `x-forwarded-*` sweep covers `-host` and
 * `-proto`, which are caller-controlled routing hints rather than identity.
 */
function buildRailsRequest(
  request: Request,
  incomingUrl: URL,
  origin: string,
  requestId: string | undefined,
  preparedBody: ReadableStream<Uint8Array> | null,
): Request {
  const clientIp = readClientIp(request);

  const target = new URL(incomingUrl.pathname + incomingUrl.search, origin);
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('x-forwarded-')) {
      headers.delete(name);
    }
  }
  canonicalizeClientIdentity(headers, clientIp);
  headers.delete('x-request-id');
  if (requestId !== undefined) headers.set('x-request-id', requestId);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && preparedBody !== null;

  return new Request(target, {
    method: request.method,
    headers,
    body: hasBody ? preparedBody : null,
    redirect: 'manual',
    // Carried on the Request rather than passed as a second argument to
    // `fetch()`: an init object makes the runtime rebuild the Request, and
    // rebuilding one whose body is a half-duplex stream is exactly what this
    // dispatch must not do. `fetch()` honours `request.signal`.
    signal: AbortSignal.timeout(RAILS_DISPATCH_TIMEOUT_MS),
    ...(hasBody ? ({ duplex: 'half' } as { duplex: 'half' }) : {}),
  });
}

/**
 * Dispatches a Rails-owned browser request to `RAILS_ORIGIN` over the public
 * internet.
 *
 * Never calls into the application — not on success and not on any failure.
 * When Rails answers, its response is returned unchanged (status, `Location`,
 * `Set-Cookie`, body, content-type, cache headers), including a 404, a 405 or a
 * 500 of its own making.
 *
 * A request body over the `rails-body-limit.ts` ceiling answers 413, before Rails can
 * complete it; a `Content-Length` Edge cannot believe answers 400.
 * A missing origin or unreachable upstream answers 503; a timeout answers 504.
 * The cases are distinguished in the response and the log. There is exactly
 * one `fetch()` call and no retry loop, for mutations as much as for reads — a
 * retried POST that timed out is a second mutation, not a second chance.
 */
export async function dispatchToRails(
  request: Request,
  // `RAILS_ORIGIN` is intentionally absent from the current wrangler config,
  // so generated `CloudflareEnv` has no property in common with an optional
  // `RAILS_ORIGIN` shape. Read the future binding defensively until a tier
  // actually declares it; this keeps the production fail-closed behavior and
  // avoids a type assertion at the Worker boundary.
  env: unknown,
  isProduction: boolean,
  requestId?: string,
): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const routeClass = classifyRailsRouteClass(incomingUrl.pathname);
  const method = normalizeRailsMethod(request.method);
  const startedAt = Date.now();
  const environment =
    typeof env === 'object' && env !== null && 'EDGE_ENV' in env
      ? normalizeEdgeEnvironment(Reflect.get(env, 'EDGE_ENV'))
      : 'unknown';
  const logContext = (status: number) =>
    requestId === undefined
      ? {}
      : { request_id: requestId, service: 'core' as const, environment, status };

  /*
   * The body ceiling is answered BEFORE the origin is read, deliberately.
   *
   * A body Edge will not relay is refused whatever the tier is configured to do
   * with it: an unconfigured `RAILS_ORIGIN` must not turn a 413 into a 503 and
   * so make the ceiling conditional on deployment state. It is also the cheaper
   * check, and the only one that can stop an upload.
   */
  const prepared = prepareRailsBody(request);
  if (prepared.kind !== 'ok') {
    const status = prepared.kind === 'too-large' ? 413 : 400;
    logRailsDispatch({
      route_class: routeClass,
      method,
      outcome: prepared.kind === 'too-large' ? 'request_too_large' : 'request_invalid_length',
      duration_ms: Date.now() - startedAt,
      ...logContext(status),
    });
    return railsBodyRefusedResponse(prepared.kind, isProduction);
  }

  const railsOrigin =
    typeof env === 'object' && env !== null && 'RAILS_ORIGIN' in env
      ? Reflect.get(env, 'RAILS_ORIGIN')
      : undefined;
  const origin = parseRailsOrigin(railsOrigin);
  if (origin === null) {
    logRailsDispatch({
      route_class: routeClass,
      method,
      outcome: 'origin_not_configured',
      duration_ms: Date.now() - startedAt,
      ...logContext(503),
    });
    return railsUnavailableResponse('not-configured', isProduction);
  }

  const railsRequest = buildRailsRequest(request, incomingUrl, origin, requestId, prepared.body);
  const bodyState = prepared.state;

  const refuseIfOversized = (): Response => {
    logRailsDispatch({
      route_class: routeClass,
      method,
      outcome: 'request_too_large',
      duration_ms: Date.now() - startedAt,
      ...logContext(413),
    });
    return railsBodyRefusedResponse('too-large', isProduction);
  };

  let response: Response;
  try {
    response = await fetch(railsRequest);
  } catch (error) {
    // The relay stream errors when the ceiling is crossed, and `fetch` rejects
    // with whatever the runtime wraps that in. The flag, not the error identity,
    // is what distinguishes an oversized upload from a dead upstream — workerd
    // and undici do not wrap it the same way.
    if (bodyState.exceeded) {
      return refuseIfOversized();
    }
    logRailsDispatch({
      route_class: routeClass,
      method,
      outcome: isTimeoutError(error) ? 'timeout' : 'upstream_unreachable',
      duration_ms: Date.now() - startedAt,
      ...logContext(isTimeoutError(error) ? 504 : 503),
    });
    return railsUnavailableResponse(isTimeoutError(error) ? 'timeout' : 'upstream', isProduction);
  }

  if (bodyState.exceeded) {
    // Rails answered, but it cannot have answered the request the client sent:
    // the body it received was errored partway through. An oversized request
    // must never be completed as a normal one, whatever the upstream replied.
    void response.body?.cancel().catch(() => undefined);
    return refuseIfOversized();
  }

  logRailsDispatch({
    route_class: routeClass,
    method,
    // 3xx counts as Rails answering normally — `/sign/out` and `/oidc/callback`
    // both redirect on their happy path.
    outcome: response.status < 400 ? 'rails_ok' : 'rails_http_error',
    duration_ms: Date.now() - startedAt,
    upstream_status: response.status,
    ...logContext(response.status),
  });
  return response;
}
