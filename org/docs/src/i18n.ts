/*
 * The public content frames use Paraglide's generated message catalog.
 *
 * The existing public URL contract is still `/{ja,en}/…`; its locale parser
 * remains the authority for these routes while the pending `lx` URL/SEO policy
 * is reviewed. Passing that parsed locale explicitly keeps SSR and hydration
 * identical without enabling Paraglide's cookie, browser preference, or URL
 * fallback strategies. Rails remains the only writer of the `language` cookie.
 */
import * as m from './paraglide/messages';

export const LOCALES = ['ja', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** The locale `x-default` points at and locale-less documents speak. */
export const DEFAULT_LOCALE: Locale = 'ja';

export function isLocale(value: string | undefined): value is Locale {
  return value === 'ja' || value === 'en';
}

/**
 * Negotiate a locale from an `Accept-Language` header for the bare `/` only.
 * A request that expresses no supported preference falls back to Japanese.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .toLowerCase()
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag, q: q === undefined ? 1 : Number(q) };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (!tag) continue;
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}

export interface UiStrings {
  skipToMain: string;
  brand: string;
  primaryNavLabel: string;
  utilityNavLabel: string;
  home: string;
  entries: string;
  search: string;
  about: string;
  viewEntries: string;
  entriesTitle: string;
  entriesHeading: string;
  entriesDescription: string;
  entriesEmpty: string;
  entriesPageTitle: (page: number) => string;
  previous: string;
  next: string;
  pagination: string;
  manage: string;
  edit: string;
  publishedAt: string;
  entryBodyStructured: string;
  searchTitle: string;
  searchHeading: string;
  searchDescription: string;
  searchLabel: string;
  searchSubmit: string;
  searchPrompt: string;
  searchNoResults: (query: string) => string;
  searchResultCount: (count: number, query: string) => string;
  searchTemporaryNotice: string;
  unavailableTitle: string;
  unavailableHeading: string;
  unavailableBody: string;
}

const localized = (locale: Locale): UiStrings => ({
  skipToMain: m.skipToMain({}, { locale }),
  brand: m.brand({}, { locale }),
  primaryNavLabel: m.primaryNavLabel({}, { locale }),
  utilityNavLabel: m.utilityNavLabel({}, { locale }),
  home: m.home({}, { locale }),
  entries: m.entries({}, { locale }),
  search: m.search({}, { locale }),
  about: m.about({}, { locale }),
  viewEntries: m.viewEntries({}, { locale }),
  entriesTitle: m.entriesTitle({}, { locale }),
  entriesHeading: m.entriesHeading({}, { locale }),
  entriesDescription: m.entriesDescription({}, { locale }),
  entriesEmpty: m.entriesEmpty({}, { locale }),
  entriesPageTitle: (page) => m.entriesPageTitle({ page }, { locale }),
  previous: m.previous({}, { locale }),
  next: m.next({}, { locale }),
  pagination: m.pagination({}, { locale }),
  manage: m.manage({}, { locale }),
  edit: m.edit({}, { locale }),
  publishedAt: m.publishedAt({}, { locale }),
  entryBodyStructured: m.entryBodyStructured({}, { locale }),
  searchTitle: m.searchTitle({}, { locale }),
  searchHeading: m.searchHeading({}, { locale }),
  searchDescription: m.searchDescription({}, { locale }),
  searchLabel: m.searchLabel({}, { locale }),
  searchSubmit: m.searchSubmit({}, { locale }),
  searchPrompt: m.searchPrompt({}, { locale }),
  searchNoResults: (query) => m.searchNoResults({ query }, { locale }),
  searchResultCount: (count, query) => m.searchResultCount({ count, query }, { locale }),
  searchTemporaryNotice: m.searchTemporaryNotice({}, { locale }),
  unavailableTitle: m.unavailableTitle({}, { locale }),
  unavailableHeading: m.unavailableHeading({}, { locale }),
  unavailableBody: m.unavailableBody({}, { locale }),
});

/** The route-facing adapter keeps the existing typed `UI[locale]` API. */
export const UI: Record<Locale, UiStrings> = {
  ja: localized('ja'),
  en: localized('en'),
};
