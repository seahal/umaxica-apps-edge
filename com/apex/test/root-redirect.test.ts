import { getDefaultRedirectUrl, resolveRedirectUrl } from '../src/root-redirect';

describe('root-redirect utilities', () => {
  describe(resolveRedirectUrl, () => {
    it("returns the correct URL for 'jp' region", () => {
      expect(resolveRedirectUrl('jp')).toBe('https://jp.umaxica.com/');
    });

    it("returns the correct URL for 'us' region", () => {
      expect(resolveRedirectUrl('us')).toBe('https://us.umaxica.com/');
    });

    it('returns the correct URL for uppercase region', () => {
      expect(resolveRedirectUrl('JP')).toBe('https://jp.umaxica.com/');
      expect(resolveRedirectUrl('US')).toBe('https://us.umaxica.com/');
    });

    it('returns null for unsupported region', () => {
      expect(resolveRedirectUrl('eu')).toBeNull();
      expect(resolveRedirectUrl('uk')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(resolveRedirectUrl(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(resolveRedirectUrl(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(resolveRedirectUrl('')).toBeNull();
    });

    it('returns null for whitespace string', () => {
      expect(resolveRedirectUrl('   ')).toBeNull();
    });

    /*
     * Open-redirect protection. `resolveRedirectUrl` is an allowlist lookup, so
     * none of these can produce a URL — but that is a property worth asserting
     * against the function rather than against the route, because the route
     * only ever shows the fallback and so cannot distinguish "rejected" from
     * "accepted something harmless". `api/routes.hurl` proves the route is
     * wired to this function; these cases prove the function is sound.
     */
    it.each([
      ['a host suffix', 'jp.evil.com'],
      ['percent-encoded dots', 'jp%2eevil%2ecom'],
      ['a path separator', 'jp/evil'],
      ['a backslash', String.raw`jp\evil`],
      ['a userinfo separator', 'jp@evil.com'],
      ['a protocol-relative host', '//evil.com'],
      ['an absolute URL', 'https://evil.com'],
      ['an embedded space', 'jp us'],
      ['a numeric code', '123'],
      ['a null byte', 'jp\0.evil.com'],
    ])('returns null when the region carries %s', (_label, region) => {
      expect(resolveRedirectUrl(region)).toBeNull();
    });
  });

  describe(getDefaultRedirectUrl, () => {
    it('returns the default region URL (jp)', () => {
      expect(getDefaultRedirectUrl()).toBe('https://jp.umaxica.com/');
    });
  });
});
