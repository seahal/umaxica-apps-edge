import { BRAND_TLD, brandFromEnv, buildBrandTitle, getBrandName } from '../src/brand';

describe('buildBrandTitle', () => {
  it('formats as "Page — UMAXICA (TLD)" when pageTitle is provided', () => {
    const result = buildBrandTitle('Pricing', { brandName: 'UMAXICA', tld: 'ORG' });
    expect(result).toBe('Pricing — UMAXICA (ORG)');
  });

  it('uses defaultPageTitle when pageTitle is not provided', () => {
    const result = buildBrandTitle(undefined, {
      brandName: 'UMAXICA',
      tld: 'ORG',
      defaultPageTitle: 'Home',
    });
    expect(result).toBe('Home — UMAXICA (ORG)');
  });

  it('returns the root title when pageTitle and defaultPageTitle are both missing', () => {
    const result = buildBrandTitle(undefined, { brandName: 'UMAXICA', tld: 'ORG' });
    expect(result).toBe('UMAXICA (ORG)');
  });

  it('applies custom separator', () => {
    const result = buildBrandTitle('Pricing', {
      brandName: 'UMAXICA',
      tld: 'ORG',
      separator: ' - ',
    });
    expect(result).toBe('Pricing - UMAXICA (ORG)');
  });

  it('falls back to the brand defaults when brandName, separator and tld are blank', () => {
    const result = buildBrandTitle('Pricing', {
      brandName: '   ',
      separator: '   ',
      tld: '   ',
    });
    expect(result).toBe('Pricing — UMAXICA (ORG)');
  });

  it('treats whitespace-only pageTitle as empty', () => {
    const result = buildBrandTitle('   ', {
      brandName: 'UMAXICA',
      tld: 'ORG',
      defaultPageTitle: 'Home',
    });
    expect(result).toBe('Home — UMAXICA (ORG)');
  });

  it('never leaks a surface or runtime name into the title', () => {
    const result = buildBrandTitle('About', { brandName: 'UMAXICA', tld: 'ORG' });
    expect(result).not.toMatch(/apex|core|edge|hono|next|workers|cloudflare/iu);
  });
});

describe('brandFromEnv', () => {
  it('reads brand values from c.env', () => {
    const brand = brandFromEnv({
      env: {
        BRAND_NAME: 'UMAXICA',
        BRAND_SEPARATOR: ' - ',
        BRAND_DEFAULT_TITLE: 'Home',
      },
    });

    expect(brand).toEqual({
      brandName: 'UMAXICA',
      separator: ' - ',
      tld: 'ORG',
      defaultPageTitle: 'Home',
    });
  });

  it('falls back to defaults when bindings are missing', () => {
    const brand = brandFromEnv({ env: {} });

    expect(brand).toEqual({
      brandName: 'UMAXICA',
      separator: ' — ',
      tld: 'ORG',
    });
  });

  it('falls back to defaults when the request context is absent', () => {
    expect(brandFromEnv(null)).toEqual({
      brandName: 'UMAXICA',
      separator: ' — ',
      tld: 'ORG',
    });
  });

  it('falls back to default separator when binding is blank', () => {
    const brand = brandFromEnv({
      env: {
        BRAND_NAME: 'UMAXICA',
        BRAND_SEPARATOR: '   ',
      },
    });

    expect(brand).toEqual({
      brandName: 'UMAXICA',
      separator: ' — ',
      tld: 'ORG',
    });
  });

  it('reads an overridden TLD from c.env', () => {
    expect(brandFromEnv({ env: { BRAND_TLD: 'ZZZ' } }).tld).toBe('ZZZ');
  });
});

describe('BRAND_TLD', () => {
  it('matches the deployment family this worker serves', () => {
    expect(BRAND_TLD).toBe('ORG');
  });
});

describe('getBrandName', () => {
  it('returns BRAND_NAME from env when present', () => {
    expect(getBrandName({ BRAND_NAME: 'UMAXICA' })).toBe('UMAXICA');
  });

  it('falls back to DEFAULT_BRAND_NAME when env is missing', () => {
    expect(getBrandName()).toBe('UMAXICA');
    expect(getBrandName({})).toBe('UMAXICA');
  });

  it('falls back to DEFAULT_BRAND_NAME when BRAND_NAME is present but not a non-empty string', () => {
    expect(getBrandName({ BRAND_NAME: '' })).toBe('UMAXICA');
    expect(getBrandName({ BRAND_NAME: 123 })).toBe('UMAXICA');
  });
});
