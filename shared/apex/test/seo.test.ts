import { describe, expect, it } from 'vite-plus/test';
import { withMeta, getMeta, setMeta, SeoHead, Layout } from '../seo';

describe('seo', () => {
  const mockContext = {
    meta: undefined as unknown as ReturnType<typeof getMeta>,
    get(key: unknown) {
      if (key === 'meta') return this.meta;
    },
    set(key: unknown, value: unknown) {
      if (key === 'meta') this.meta = value as ReturnType<typeof getMeta>;
    },
  };

  describe('toNonEmptyTrimmed via SeoHead', () => {
    it('handles empty string title', () => {
      setMeta(mockContext, { title: '' });

      const result = SeoHead({
        c: mockContext,
        brand: { brandName: 'TestBrand' },
      });

      expect(result).toBeDefined();
    });

    it('handles whitespace-only title', () => {
      setMeta(mockContext, { title: '   ' });

      const result = SeoHead({
        c: mockContext,
        brand: { brandName: 'TestBrand' },
      });

      expect(result).toBeDefined();
    });
  });

  describe('withMeta', () => {
    it('sets meta context', async () => {
      const middleware = withMeta({ title: 'Test' });
      const next = vi.fn<() => void>();

      // @ts-expect-error mock context
      await middleware(mockContext, next);

      expect(next).toHaveBeenCalled();
      expect(mockContext.get('meta')).toEqual({ title: 'Test' });
    });
  });

  describe('getMeta', () => {
    it('returns meta from context', () => {
      mockContext.set('meta', { title: 'Test' });
      const meta = getMeta(mockContext);
      expect(meta?.title).toBe('Test');
    });

    it('returns defaultMeta when context meta is undefined', () => {
      mockContext.meta = undefined;
      const meta = getMeta(mockContext, { title: 'Default' });
      expect(meta?.title).toBe('Default');
    });
  });

  describe('setMeta', () => {
    it('sets meta on context', () => {
      setMeta(mockContext, { title: 'New' });
      expect(mockContext.get('meta')).toEqual({ title: 'New' });
    });
  });

  describe('SeoHead', () => {
    it('renders with full meta', () => {
      setMeta(mockContext, {
        title: 'Test Title',
        description: 'Test description',
        canonical: 'https://example.com',
        robots: 'index,follow',
        og: {
          title: 'OG Title',
          description: 'OG description',
          type: 'website',
          url: 'https://example.com',
          image: 'https://example.com/image.png',
        },
        twitter: {
          card: 'summary',
          site: '@example',
        },
      });

      const result = SeoHead({
        c: mockContext,
        brand: { brandName: 'TestBrand' },
      });

      expect(result).toBeDefined();
    });

    it('renders without optional meta', () => {
      setMeta(mockContext, {});

      const result = SeoHead({
        c: mockContext,
        brand: { brandName: 'TestBrand' },
      });

      expect(result).toBeDefined();
    });

    it('uses defaultMeta when context meta is undefined', () => {
      mockContext.meta = undefined;

      const result = SeoHead({
        c: mockContext,
        brand: { brandName: 'TestBrand' },
        defaultMeta: { title: 'Default' },
      });

      expect(result).toBeDefined();
    });
  });

  describe('Layout', () => {
    it('renders with defaultMeta', () => {
      const result = Layout({
        c: mockContext,
        brand: { brandName: 'TestBrand' },
        defaultMeta: { title: 'Default' },
        children: 'content',
      });

      expect(result).toBeDefined();
    });

    it('renders without defaultMeta', () => {
      const result = Layout({
        c: mockContext,
        brand: { brandName: 'TestBrand' },
        children: 'content',
      });

      expect(result).toBeDefined();
    });

    it('renders with custom lang', () => {
      const result = Layout({
        c: mockContext,
        brand: { brandName: 'TestBrand' },
        children: 'content',
        lang: 'en',
      });

      expect(result).toBeDefined();
    });
  });
});
