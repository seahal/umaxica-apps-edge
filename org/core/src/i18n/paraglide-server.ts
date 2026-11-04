import '@tanstack/react-start/server-only';
import { EDGE_DISPLAY_LOCALE_HEADER, localeFromDisplayHeader } from '../lib/display-locale';
import { defineCustomServerStrategy } from '../paraglide/runtime';

defineCustomServerStrategy('custom-edge-locale', {
  getLocale: (request) =>
    localeFromDisplayHeader(request?.headers.get(EDGE_DISPLAY_LOCALE_HEADER) ?? null),
});
