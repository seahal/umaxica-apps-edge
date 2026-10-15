import { CANONICAL_ORIGINS } from './publishing-cell';
import { PUBLISHING_AUDIENCE, PUBLISHING_SURFACE } from './publishing-cell';

/* Derived from this unit's canonical origins and its wrangler Worker name. */
const PUBLIC_HOSTS = new Set(
  Object.values(CANONICAL_ORIGINS).map((origin) => new URL(origin).hostname),
);
export const PUBLIC_WORKER_NAME = `umaxica-apps-edge-${PUBLISHING_AUDIENCE}-${PUBLISHING_SURFACE}`;
export const PUBLIC_PREVIEW_HOST = `${PUBLIC_WORKER_NAME}.account.workers.dev`;
const PREVIEW_HOST_PATTERN = new RegExp(
  `^(?:[a-z0-9]+-)?${PUBLIC_WORKER_NAME}[.][a-z0-9-]+[.]workers[.]dev$`,
  'u',
);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type PublishingHostPolicy = { allowLocalhost: boolean };

function isLocalHost(hostname: string): boolean {
  return (
    LOCAL_HOSTS.has(hostname) ||
    (hostname.length > '.localhost'.length && hostname.endsWith('.localhost'))
  );
}

export function isAllowedPublishingHost(
  hostname: string | undefined,
  policy: PublishingHostPolicy,
): boolean {
  if (hostname === undefined || hostname.length === 0) return false;
  const normalized = hostname.toLowerCase();
  if (PUBLIC_HOSTS.has(normalized) || PREVIEW_HOST_PATTERN.test(normalized)) return true;
  return policy.allowLocalhost && isLocalHost(normalized);
}

export function isProductionPublishingEnvironment(env: unknown): boolean {
  return (
    typeof env === 'object' && env !== null && 'EDGE_ENV' in env && env.EDGE_ENV === 'production'
  );
}

export function publishingHostRejectedResponse(): Response {
  return new Response('Misdirected Request\n', {
    status: 421,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
