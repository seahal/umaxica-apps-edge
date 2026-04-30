import { brandFromEnv, buildBrandTitle } from '../title';

describe('buildBrandTitle', () => {
  it('formats as "Brand | Page" when pageTitle is provided', () => {
    const result = buildBrandTitle('Pricing', { brandName: 'Umaxica' });
    expect(result).toBe('Umaxica | Pricing');
  });

  it('uses defaultPageTitle when pageTitle is not provided', () => {
    const result = buildBrandTitle(undefined, {
      brandName: 'Umaxica',
      defaultPageTitle: 'Home',
    });
    expect(result).toBe('Umaxica | Home');
  });

  it('returns only brandName when pageTitle and defaultPageTitle are both missing', () => {
    const result = buildBrandTitle(undefined, { brandName: 'Umaxica' });
    expect(result).toBe('Umaxica');
  });

  it('applies custom separator', () => {
    const result = buildBrandTitle('Pricing', {
      brandName: 'Umaxica',
      separator: ' - ',
    });
    expect(result).toBe('Umaxica - Pricing');
  });

  it('treats whitespace-only pageTitle as empty', () => {
    const result = buildBrandTitle('   ', {
      brandName: 'Umaxica',
      defaultPageTitle: 'Home',
    });
    expect(result).toBe('Umaxica | Home');
  });
});

describe('brandFromEnv', () => {
  it('reads brand values from c.env', () => {
    const brand = brandFromEnv({
      env: {
        BRAND_NAME: 'Umaxica',
        BRAND_SEPARATOR: ' - ',
        BRAND_DEFAULT_TITLE: 'Home',
      },
    });

    expect(brand).toEqual({
      brandName: 'Umaxica',
      separator: ' - ',
      defaultPageTitle: 'Home',
    });
  });

  it('falls back to defaults when bindings are missing', () => {
    const brand = brandFromEnv({ env: {} });

    expect(brand).toEqual({
      brandName: 'Umaxica',
      separator: ' | ',
    });
  });

  it('handles whitespace-only separator', () => {
    const brand = brandFromEnv({
      env: {
        BRAND_NAME: 'Umaxica',
        BRAND_SEPARATOR: '   ',
      },
    });

    expect(brand.separator).toBe(' | ');
  });

  it('handles null/undefined c parameter', () => {
    const brand1 = brandFromEnv(null);
    expect(brand1.brandName).toBe('Umaxica');

    const brand2 = brandFromEnv(undefined);
    expect(brand2.brandName).toBe('Umaxica');
  });
});

describe('buildBrandTitle', () => {
  it('handles whitespace-only brand name', () => {
    const result = buildBrandTitle('Page', {
      brandName: '   ',
      defaultPageTitle: 'Default',
    });
    expect(result).toBe('Umaxica | Page');
  });

  it('handles null pageTitle', () => {
    const result = buildBrandTitle(null, {
      brandName: 'Umaxica',
      defaultPageTitle: 'Home',
    });
    expect(result).toBe('Umaxica | Home');
  });

  it('handles empty string pageTitle', () => {
    const result = buildBrandTitle('', {
      brandName: 'Umaxica',
      defaultPageTitle: 'Home',
    });
    expect(result).toBe('Umaxica | Home');
  });
});
