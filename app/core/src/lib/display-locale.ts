import { defaultLocale, isLocale, type Locale } from '@/i18n/config';

/** Request-local metadata added after the Core Worker has stripped cookies. */
export const EDGE_DISPLAY_LOCALE_HEADER = 'x-edge-display-locale';

/**
 * Resolve display language from the last scalar `lx` URL parameter.
 * Repeated scalar keys retain Rails' last-value contract. Bracketed, missing,
 * empty and invalid values use the existing default locale.
 */
export function resolveDisplayLocale(url: URL): Locale {
  return normalizeLocale(url.searchParams.getAll('lx').at(-1)) ?? defaultLocale;
}

/** Validate the internal value again at the application strategy boundary. */
export function localeFromDisplayHeader(value: string | null): Locale | undefined {
  return normalizeLocale(value);
}

function normalizeLocale(value: string | null | undefined): Locale | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = value.toLowerCase();
  return isLocale(normalized) ? normalized : undefined;
}
