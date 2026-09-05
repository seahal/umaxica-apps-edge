import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, isLocale, negotiateLocale } from '../src/i18n';

describe('org/news locale negotiation', () => {
  it('treats only ja and en as locales', () => {
    expect(isLocale('ja')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('falls back to the default locale when the header is missing or unmatched', () => {
    expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale('fr-FR,de;q=0.8')).toBe(DEFAULT_LOCALE);
  });

  it('prefers the highest-q supported language', () => {
    expect(negotiateLocale('en-US,en;q=0.9,ja;q=0.8')).toBe('en');
    expect(negotiateLocale('ja-JP,en;q=0.4')).toBe('ja');
  });

  it('skips empty language tags', () => {
    expect(negotiateLocale(',en;q=0.9')).toBe('en');
  });
});
