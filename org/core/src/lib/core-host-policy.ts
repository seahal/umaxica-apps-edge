import { CANONICAL_ORIGIN } from './canonical';

/*
 * The public Core hosts already have two configuration owners: the canonical
 * URL in this unit and the matching `jp`/`us` entries in vite.config.ts. Derive
 * the second region from the existing canonical host instead of maintaining a
 * third hand-written host table here. The Worker name follows this unit's
 * wrangler `name` entry, which is what exposes its stable workers.dev URL.
 */
export const CORE_PUBLIC_HOST = new URL(CANONICAL_ORIGIN).hostname;
export const CORE_ALTERNATE_HOST = CORE_PUBLIC_HOST.replace(/^jp\./u, 'us.');
const brandTld = CORE_PUBLIC_HOST.slice(CORE_PUBLIC_HOST.lastIndexOf('.') + 1);
export const CORE_WORKER_NAME = `umaxica-apps-edge-${brandTld}-core`;

const WORKERS_DEV_HOST_PATTERN = new RegExp(
  `^${CORE_WORKER_NAME}[.][a-z0-9-]+[.]workers[.]dev$`,
  'u',
);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type CoreHostPolicy = {
  allowLocalhost: boolean;
};

function isLocalHost(hostname: string): boolean {
  return (
    LOCAL_HOSTS.has(hostname) ||
    (hostname.length > '.localhost'.length && hostname.endsWith('.localhost'))
  );
}

export function isAllowedCoreHost(hostname: string | undefined, policy: CoreHostPolicy): boolean {
  if (hostname === undefined || hostname.length === 0) return false;

  const normalized = hostname.toLowerCase();
  if (
    normalized === CORE_PUBLIC_HOST ||
    normalized === CORE_ALTERNATE_HOST ||
    WORKERS_DEV_HOST_PATTERN.test(normalized)
  ) {
    return true;
  }

  return policy.allowLocalhost && isLocalHost(normalized);
}

export function isProductionCoreEnvironment(env: unknown): boolean {
  return (
    typeof env === 'object' && env !== null && 'EDGE_ENV' in env && env.EDGE_ENV === 'production'
  );
}

export function coreHostRejectedResponse(): Response {
  return new Response('Misdirected Request\n', {
    status: 421,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
