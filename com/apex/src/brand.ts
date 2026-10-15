export const DEFAULT_BRAND_NAME = 'UMAXICA';

/**
 * EM DASH. The UMAXICA title contract is `{PAGE} — UMAXICA ({TLD})`; the page
 * name leads and the brand closes. Do not substitute a hyphen or a pipe.
 */
export const DEFAULT_BRAND_SEPARATOR = ' — ';

/**
 * The TLD notation for this deployment unit, uppercase, matching the FQDN this
 * worker serves. Each frame owns its own copy of this module, so this constant
 * is a literal rather than a lookup.
 */
export const BRAND_TLD = 'COM';

// Takes `unknown` because its one caller outside the typed app is the JSX
// renderer, whose callback context Hono hands over untyped — the bindings
// arrived here as `any` and spread from there. Reading the single field this
// needs, and checking its type, replaces that with a value the compiler can
// account for. `||` rather than `??` is deliberate: an empty `BRAND_NAME` is a
// missing brand name, not a brand named "".
export function getBrandName(env?: unknown): string {
  if (typeof env !== 'object' || env === null || !('BRAND_NAME' in env)) {
    return DEFAULT_BRAND_NAME;
  }
  const brandName: unknown = env.BRAND_NAME;
  return typeof brandName === 'string' && brandName.length > 0 ? brandName : DEFAULT_BRAND_NAME;
}

export type BrandTitleOptions = {
  brandName: string;
  separator?: string;
  tld?: string;
  defaultPageTitle?: string;
};

type ContextWithEnv = {
  env?: Record<string, unknown>;
};

function toNonEmptyTrimmed(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveSeparator(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return value.trim().length > 0 ? value : undefined;
}

export function brandFromEnv(c: ContextWithEnv | null | undefined): BrandTitleOptions {
  const env = c?.env ?? {};
  const defaultPageTitle = toNonEmptyTrimmed(env['BRAND_DEFAULT_TITLE']);

  // Cloudflare Workers vars:
  // - BRAND_NAME
  // - BRAND_SEPARATOR
  // - BRAND_DEFAULT_TITLE (optional)
  return {
    brandName: toNonEmptyTrimmed(env['BRAND_NAME']) ?? DEFAULT_BRAND_NAME,
    separator: resolveSeparator(env['BRAND_SEPARATOR']) ?? DEFAULT_BRAND_SEPARATOR,
    tld: toNonEmptyTrimmed(env['BRAND_TLD']) ?? BRAND_TLD,
    ...(defaultPageTitle ? { defaultPageTitle } : {}),
  };
}

/**
 * Root title  -> `UMAXICA (TLD)`
 * Page title  -> `{PAGE} — UMAXICA (TLD)`
 *
 * Surface and runtime names (apex, core, edge, Hono, Workers, ...) must never
 * reach this function: the title a user sees may not reveal which runtime
 * served the route.
 */
export function buildBrandTitle(
  pageTitle: string | null | undefined,
  opt: BrandTitleOptions,
): string {
  const brandName = toNonEmptyTrimmed(opt.brandName) ?? DEFAULT_BRAND_NAME;
  const separator = resolveSeparator(opt.separator) ?? DEFAULT_BRAND_SEPARATOR;
  const tld = toNonEmptyTrimmed(opt.tld) ?? BRAND_TLD;
  const page = toNonEmptyTrimmed(pageTitle) ?? toNonEmptyTrimmed(opt.defaultPageTitle);
  const root = `${brandName} (${tld})`;

  return page ? `${page}${separator}${root}` : root;
}
