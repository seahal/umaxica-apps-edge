import { BRAND_TLD } from './brand';

/*
 * These values are derived from this unit's existing brand and Worker name.
 * The Vite `allowedHosts` and wrangler `name` entries are the configuration
 * source; keeping the derivation here avoids a second cross-unit host table.
 */
export const APEX_PUBLIC_HOST = `umaxica.${BRAND_TLD.toLowerCase()}`;
export const APEX_WORKER_NAME = `umaxica-apps-edge-${BRAND_TLD.toLowerCase()}-apex`;
export const APEX_PUBLIC_ORIGIN = `https://${APEX_PUBLIC_HOST}`;

// The account label is intentionally a fixture-shaped value for tests. The
// allowlist below accepts only the same hostname shape with one account label.
export const APEX_PREVIEW_HOST = `${APEX_WORKER_NAME}.account.workers.dev`;

const PREVIEW_HOST_SOURCE = `(?:[a-z0-9]+-)?${APEX_WORKER_NAME}\\.[a-z0-9-]+\\.workers\\.dev`;
const PREVIEW_HOST_PATTERN = new RegExp(`^${PREVIEW_HOST_SOURCE}$`, 'u');
const PREVIEW_ORIGIN_PATTERN = new RegExp(`^https://${PREVIEW_HOST_SOURCE}$`, 'u');
const LOCAL_ORIGIN_PATTERN = new RegExp(
  `^http://${BRAND_TLD.toLowerCase()}\\.localhost(?::\\d+)?$`,
  'u',
);

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type ApexHostPolicy = {
  allowLocalhost: boolean;
};

export type ApexOriginPolicy = {
  allowLocalhost: boolean;
};

function isLocalHost(hostname: string): boolean {
  return (
    LOCAL_HOSTS.has(hostname) ||
    (hostname.length > '.localhost'.length && hostname.endsWith('.localhost'))
  );
}

export function isAllowedApexHost(hostname: string | undefined, policy: ApexHostPolicy): boolean {
  if (hostname === undefined || hostname.length === 0) return false;

  const normalized = hostname.toLowerCase();
  if (normalized === APEX_PUBLIC_HOST || PREVIEW_HOST_PATTERN.test(normalized)) return true;

  return policy.allowLocalhost && isLocalHost(normalized);
}

export function isAllowedApexOrigin(origin: string | undefined, policy: ApexOriginPolicy): boolean {
  if (origin === undefined || origin.length === 0) return false;
  if (origin === APEX_PUBLIC_ORIGIN || PREVIEW_ORIGIN_PATTERN.test(origin)) return true;
  return policy.allowLocalhost && LOCAL_ORIGIN_PATTERN.test(origin);
}

export function isProductionApexEnvironment(env: unknown): boolean {
  return (
    typeof env === 'object' && env !== null && 'EDGE_ENV' in env && env.EDGE_ENV === 'production'
  );
}

export function hostRejectedResponse(): Response {
  return new Response('Misdirected Request\n', {
    status: 421,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
