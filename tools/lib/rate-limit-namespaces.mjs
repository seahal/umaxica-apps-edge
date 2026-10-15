// Account-wide RATE_LIMITER namespace allocation (adr/022).
//
// This module is a registry, not a shared runtime package. Cloudflare Rate
// Limiting counters are account-scoped: two Workers that share a namespace_id
// share the counter, even across repositories. Per-unit wrangler.jsonc still
// owns each binding; this file is the one place that can see Edge and Jump
// together and refuse a copy-paste collision.
//
// Development ports stay in each unit's package.json `scripts.dev --port`.
// Do not copy that table here. Production RATE_LIMITER ids are
// `<dev-port><region>`. Non-production ids prefix that with an environment
// digit.
//
// AUTH_RATE_LIMITER is outside this scheme. It keeps ADR 010's X10N series
// (`<tier>10<brand-digit>`), 60/60, Core-only paths, and first-touch ordering.

export const REGION = {
  GLOBAL: '00',
  USA: '01',
  JAPAN: '81',
};

/** First two digits of the existing development-port allocation. */
export const TLD_CODE = {
  com: '51',
  net: '52',
  org: '53',
  app: '54',
  dev: '55',
};

/**
 * Last two digits of the existing development-port allocation.
 * Unused numbers are not free to reassign.
 */
export const SURFACE_CODE = {
  apex: '01',
  info: '03',
  core: '05',
  docs: '06',
  news: '07',
  help: '08',
  jump: '09',
};

export const GLOBAL_SURFACES = new Set(['apex', 'info', 'docs', 'news', 'help', 'jump']);

/** Prefix on the six-digit port+region id. Production carries none. */
export const ENV_PREFIX = {
  production: '',
  development: '2',
  test: '3',
  vpc: '4',
  local: '5',
};

export const RATE_LIMITER_BUDGET = { limit: 2000, period: 60 };
export const AUTH_RATE_LIMITER_BUDGET = { limit: 60, period: 60 };

/** ADR 010 AUTH series. Not a listening port and not surface code 09 (jump). */
export const AUTH_SERIES = '10';
export const AUTH_BRAND_DIGIT = {
  app: '1',
  com: '2',
  org: '3',
};

export const JUMP = {
  repo: 'umaxica-apps-edge-jump',
  brand: 'net',
  surface: 'jump',
  port: '5209',
  region: REGION.GLOBAL,
  productionNamespaceId: '520900',
  binding: 'JUMP_RATE_LIMITER',
  limit: 600,
  period: 60,
};

/** Historical Jump ids. Retired; must not be reused as active allocations. */
export const RETIRED_NAMESPACE_IDS = new Set(['999', '1006']);

/** Documented USA Core RATE_LIMITER ids. Reserved, not configured. */
export const RESERVED_USA_CORE_NAMESPACE_IDS = new Set(['510501', '530501', '540501']);

export const POSITIVE_INTEGER_STRING = /^[1-9][0-9]*$/u;

export function parseWorkspace(ws) {
  const [brand, surface] = ws.split('/');
  return { brand, surface };
}

export function regionForSurface(surface) {
  if (surface === 'core') return REGION.JAPAN;
  if (GLOBAL_SURFACES.has(surface)) return REGION.GLOBAL;
  return null;
}

export function developmentPortFromDevScript(script) {
  const match = /--port\s+(\d{4})\b/u.exec(script ?? '');
  return match ? match[1] : null;
}

export function expectedDevelopmentPort(brand, surface) {
  const tld = TLD_CODE[brand];
  const code = SURFACE_CODE[surface];
  if (!tld || !code) return null;
  return `${tld}${code}`;
}

export function rateLimiterNamespace({ env, port, region }) {
  const prefix = ENV_PREFIX[env];
  if (prefix === undefined) {
    throw new Error(`unknown rate-limit environment ${env}`);
  }
  return `${prefix}${port}${region}`;
}

export function authRateLimiterNamespace({ env, brand }) {
  const envDigit = env === 'production' ? '1' : ENV_PREFIX[env];
  if (!envDigit) {
    throw new Error(`unknown rate-limit environment ${env}`);
  }
  const brandDigit = AUTH_BRAND_DIGIT[brand];
  if (!brandDigit) {
    throw new Error(`AUTH_RATE_LIMITER has no brand digit for ${brand}`);
  }
  return `${envDigit}${AUTH_SERIES}${brandDigit}`;
}

export function regionSuffixOf(namespaceId) {
  const id = String(namespaceId);
  return id.length >= 2 ? id.slice(-2) : '';
}

export function isPositiveIntegerString(namespaceId) {
  return POSITIVE_INTEGER_STRING.test(String(namespaceId));
}
