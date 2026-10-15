const SITE_URL = 'umaxica.app';

const allowedUrls = {
  jp: `https://jp.${SITE_URL}/`,
  us: `https://us.${SITE_URL}/`,
} as const;

type AllowedRegion = keyof typeof allowedUrls;

const DEFAULT_REGION: AllowedRegion = 'jp';

// A query parameter is a string from the network, not an `AllowedRegion`.
// Narrowing it with a guard rather than asserting it keeps the `null` branch
// below reachable — under the assertion the index access was typed as always
// returning a URL, so the "unsupported region" path was unreachable to the
// compiler while still being reachable at runtime.
const isAllowedRegion = (value: string): value is AllowedRegion =>
  Object.hasOwn(allowedUrls, value);

export const resolveRedirectUrl = (regionParam: string | null | undefined) => {
  const normalizedRegion = regionParam?.toLowerCase() ?? '';
  return isAllowedRegion(normalizedRegion) ? allowedUrls[normalizedRegion] : null;
};

export const getDefaultRedirectUrl = () => allowedUrls[DEFAULT_REGION];
