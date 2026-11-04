import { defineCustomClientStrategy } from '../paraglide/runtime';
import { isLocale } from './config';

/*
 * The browser receives the locale already selected for this document in
 * `<html lang>`. Reading that request-local marker keeps hydration aligned
 * without consulting Cookie, localStorage, navigator, or a URL fallback.
 */
defineCustomClientStrategy('custom-edge-locale', {
  getLocale: () => {
    if (typeof document === 'undefined') return undefined;
    const value = document.documentElement.lang;
    return isLocale(value) ? value : undefined;
  },
  // Locale changes are URL changes owned by TanStack Router. Paraglide must
  // not write a cookie or mutate the URL behind the router's back.
  setLocale: () => undefined,
});
