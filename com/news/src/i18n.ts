/*
 * The public content frames use Paraglide's generated message catalog.
 *
 * The existing public URL contract is still `/{ja,en}/…`; its locale parser
 * remains the authority for these routes while the pending `lx` URL/SEO policy
 * is reviewed. Passing that parsed locale explicitly keeps SSR and hydration
 * identical without enabling Paraglide's cookie, browser preference, or URL
 * fallback strategies. Rails remains the only writer of the `language` cookie.
 */
import { messagesFor } from './lib/message-catalog';

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

const localized = (locale: Locale): UiStrings => {
  const m = messagesFor(locale);
  return {
    skipToMain: m.skiptomain2({}),
    brand: m.brand({}),
    primaryNavLabel: m.primarynavlabel2({}),
    utilityNavLabel: m.utilitynavlabel2({}),
    home: m.home({}),
    entries: m.entries({}),
    search: m.search({}),
    about: m.about({}),
    viewEntries: m.viewentries1({}),
    entriesTitle: m.entriestitle1({}),
    entriesHeading: m.entriesheading1({}),
    entriesDescription: m.entriesdescription1({}),
    entriesEmpty: m.entriesempty1({}),
    entriesPageTitle: (page) => m.entriespagetitle2({ page }),
    previous: m.previous({}),
    next: m.next({}),
    pagination: m.pagination({}),
    manage: m.manage({}),
    edit: m.edit({}),
    publishedAt: m.publishedat1({}),
    entryBodyStructured: m.entrybodystructured2({}),
    searchTitle: m.searchtitle1({}),
    searchHeading: m.searchheading1({}),
    searchDescription: m.searchdescription1({}),
    searchLabel: m.searchlabel1({}),
    searchSubmit: m.searchsubmit1({}),
    searchPrompt: m.searchprompt1({}),
    searchNoResults: (query) => m.searchnoresults2({ query }),
    searchResultCount: (count, query) => m.searchresultcount2({ count, query }),
    searchTemporaryNotice: m.searchtemporarynotice2({}),
    unavailableTitle: m.unavailabletitle1({}),
    unavailableHeading: m.unavailableheading1({}),
    unavailableBody: m.unavailablebody1({}),
  };
};

/** The route-facing adapter keeps the existing typed `UI[locale]` API. */
export const UI: Record<Locale, UiStrings> = {
  ja: localized('ja'),
  en: localized('en'),
};
