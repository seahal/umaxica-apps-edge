import { brandFromEnv, buildBrandTitle, getBrandName } from '../src/brand';

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

  it('falls back when brandName and separator are blank', () => {
    const result = buildBrandTitle('Pricing', {
      brandName: '   ',
      separator: '   ',
    });
    expect(result).toBe('UMAXICA | Pricing');
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
      brandName: 'UMAXICA',
      separator: ' | ',
    });
  });

  it('falls back to default separator when binding is blank', () => {
    const brand = brandFromEnv({
      env: {
        BRAND_NAME: 'Umaxica',
        BRAND_SEPARATOR: '   ',
      },
    });

    expect(brand).toEqual({
      brandName: 'Umaxica',
      separator: ' | ',
    });
  });
});

describe('getBrandName', () => {
  it('returns BRAND_NAME from env when present', () => {
    expect(getBrandName({ BRAND_NAME: 'Umaxica' })).toBe('Umaxica');
  });

  it('falls back to DEFAULT_BRAND_NAME when env is missing', () => {
    expect(getBrandName()).toBe('UMAXICA');
    expect(getBrandName({})).toBe('UMAXICA');
  });
});
