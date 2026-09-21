import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n';

/** The only browser preference cookie Edge may read for application display. */
export const LANGUAGE_COOKIE_NAME = 'language';

/**
 * Resolve the display language using the Rails request-context contract.
 *
 * `URLSearchParams` keeps repeated scalar keys in order; Rails' parameter
 * parser exposes the last scalar value. Bracketed values such as `lx[]=en` do
 * not become a scalar `lx` here, so they fall through to the language cookie.
 * Invalid values also fall through. The result is always one of the two
 * locales, so callers never need to pass raw request data into the app.
 */
export function resolveDisplayLocale(request: Request): Locale {
  const url = new URL(request.url);
  const requested = url.searchParams.getAll('lx').at(-1);
  const requestedLocale = normalizeLocale(requested);
  if (requestedLocale !== undefined) return requestedLocale;

  const cookieLocale = normalizeLocale(cookieValue(request.headers.get('cookie')));
  return cookieLocale ?? DEFAULT_LOCALE;
}

function normalizeLocale(value: string | null | undefined): Locale | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = value.toLowerCase();
  return isLocale(normalized) ? normalized : undefined;
}

function cookieValue(header: string | null): string | undefined {
  if (header === null) return undefined;

  let found: string | undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name === LANGUAGE_COOKIE_NAME) found = part.slice(separator + 1).trim();
  }
  return found;
}
