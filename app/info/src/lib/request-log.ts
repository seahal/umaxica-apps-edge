/**
 * The completion log for a TanStack Start Edge request.
 *
 * This is deliberately a small, local emitter rather than Hono middleware:
 * the fifteen TanStack units do not carry Hono into their server entry. The
 * fields are closed so a call site cannot add a pathname, query, header, body,
 * exception text or another free-form value to a Workers Log line.
 */

export { getRequestId, runWithRequestId } from '../security-nonce';

export type EdgeService = 'core' | 'public';

export type EdgeRequestMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'OTHER';

export type EdgeEnvironment = 'production' | 'development' | 'test' | 'local' | 'vpc' | 'unknown';

export type EdgeRequestRoute =
  | 'root'
  | 'about'
  | 'health'
  | 'health-startup'
  | 'health-liveness'
  | 'health-readiness'
  | 'health-api'
  | 'revision'
  | 'revision-api'
  | 'assets'
  | 'publishing'
  | 'api_v0'
  | 'web_v0'
  | 'edge_v0'
  | 'oidc'
  | 'sign_out'
  | 'jwks'
  | 'csp_report'
  | 'other';

export type EdgeRequestOutcome = 'completed' | 'rejected' | 'failed' | 'timeout';

export interface EdgeRequestLogEntry {
  service: EdgeService;
  environment: EdgeEnvironment;
  request_id: string;
  method: EdgeRequestMethod;
  route: EdgeRequestRoute;
  status: number;
  duration_ms: number;
  outcome: EdgeRequestOutcome;
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

/** Adds the Edge-generated ID without changing a response's body or status. */
export function withRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Request-ID', requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Adds the Edge-generated ID to the request handed to the application. */
export function withRequestIdRequest(request: Request, requestId: string): Request {
  const headers = new Headers(request.headers);
  headers.set('X-Request-ID', requestId);
  const body = request.body;
  return new Request(request.url, {
    cache: request.cache,
    credentials: request.credentials,
    headers,
    integrity: request.integrity,
    keepalive: request.keepalive,
    method: request.method,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal,
    ...(body === null ? {} : { body, duplex: 'half' as const }),
  });
}

export function normalizeEdgeMethod(method: string): EdgeRequestMethod {
  const upper = method.toUpperCase();
  switch (upper) {
    case 'GET':
    case 'HEAD':
    case 'POST':
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
    case 'OPTIONS':
      return upper;
    default:
      return 'OTHER';
  }
}

export function normalizeEdgeEnvironment(value: unknown): EdgeEnvironment {
  switch (value) {
    case 'production':
    case 'development':
    case 'test':
    case 'local':
    case 'vpc':
      return value;
    default:
      return 'unknown';
  }
}

/** Reduces a URL path to a fixed route label before it reaches the logger. */
export function classifyEdgeRoute(pathname: string): EdgeRequestRoute {
  switch (pathname) {
    case '/':
      return 'root';
    case '/about':
    case '/about/':
      return 'about';
    case '/health':
      return 'health';
    case '/health/startups':
      return 'health-startup';
    case '/health/livenesses':
      return 'health-liveness';
    case '/health/readinesses':
      return 'health-readiness';
    case '/api/v0/health.json':
      return 'health-api';
    case '/revision':
    case '/revision/':
      return 'revision';
    case '/api/v0/revision.json':
      return 'revision-api';
    case '/.well-known/jwks.json':
      return 'jwks';
    case '/csp-violation-report':
      return 'csp_report';
    case '/sign/out':
    case '/sign/out/complete':
      return 'sign_out';
  }

  if (pathname.startsWith('/assets/')) return 'assets';
  if (pathname === '/api/v0' || pathname.startsWith('/api/v0/')) return 'api_v0';
  if (pathname === '/web/v0' || pathname.startsWith('/web/v0/')) return 'web_v0';
  if (pathname === '/edge/v0' || pathname.startsWith('/edge/v0/')) return 'edge_v0';
  if (pathname === '/oidc' || pathname.startsWith('/oidc/')) return 'oidc';
  if (/^\/(?:ja|en)(?:\/|$)/u.test(pathname)) return 'publishing';
  return 'other';
}

export function outcomeForStatus(status: number): EdgeRequestOutcome {
  if (status >= 500) return 'failed';
  if (status >= 400) return 'rejected';
  return 'completed';
}

function levelFor(outcome: EdgeRequestOutcome): 'info' | 'warn' | 'error' {
  if (outcome === 'completed') return 'info';
  return outcome === 'rejected' ? 'warn' : 'error';
}

export function logEdgeRequest(entry: EdgeRequestLogEntry): void {
  const line = JSON.stringify({
    level: levelFor(entry.outcome),
    msg: 'edge_request',
    data: {
      event: 'edge_request',
      service: entry.service,
      environment: entry.environment,
      request_id: entry.request_id,
      method: entry.method,
      route: entry.route,
      status: entry.status,
      duration_ms: entry.duration_ms,
      outcome: entry.outcome,
    },
  });

  if (entry.outcome === 'completed') {
    // oxlint-disable-next-line no-console
    console.log(line);
  } else if (entry.outcome === 'rejected') {
    // oxlint-disable-next-line no-console
    console.warn(line);
  } else {
    // oxlint-disable-next-line no-console
    console.error(line);
  }
}
