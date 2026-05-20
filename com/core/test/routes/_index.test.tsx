/**
 * Home Route Test (com)
 *
 * Tests for the com domain home route (_index.tsx).
 * This is a concrete example based on the route.test.template.tsx template.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { CloudflareContext } from '../../src/context';

const { loader, meta, default: Home } = await import('../../src/routes/_index');

function createMockContext(data: { cloudflare?: { env?: Record<string, unknown> } }) {
  const contextMap = new Map<unknown, unknown>([[CloudflareContext, data]]);

  return {
    get: (key: unknown) => contextMap.get(key),
  };
}

describe('Route: Home (com)', () => {
  describe('Meta', () => {
    it('should return localized title and description', () => {
      const result = meta({ data: { codeName: 'UMAXICA' } } as never);
      expect(result).toStrictEqual([
        { title: 'UMAXICA (com)' },
        {
          content: '抽象的なバリュープロポジションで魅せるコーポレートサイトのサンプル。',
          name: 'description',
        },
        { content: 'index, follow', name: 'robots' },
      ]);
    });
  });

  describe('Loader', () => {
    it('should return message from Cloudflare env', () => {
      const mockContext = createMockContext({
        cloudflare: {
          env: {
            VALUE_FROM_CLOUDFLARE: 'Test Message',
          },
        },
      });

      const result = loader({
        context: mockContext,
      } as never);

      expect(result).toStrictEqual({ codeName: 'Umaxica', message: 'Test Message' });
    });

    it('should throw error when Cloudflare context is missing', () => {
      const contextMap = new Map();
      const mockContext = {
        get: (key: symbol) => contextMap.get(key),
      };

      expect(() =>
        loader({
          context: mockContext,
        } as never),
      ).toThrow('Cloudflare environment is not available');
    });

    it('should handle missing env variables', () => {
      const mockContext = createMockContext({
        cloudflare: {
          env: {},
        },
      });

      const result = loader({
        context: mockContext,
      } as never);

      expect(result).toStrictEqual({ codeName: 'Umaxica', message: '' });
    });

    it('should throw error when cloudflare object is undefined', () => {
      const mockContext = createMockContext({
        cloudflare: undefined,
      } as unknown as { cloudflare?: { env?: Record<string, unknown> } });

      expect(() =>
        loader({
          context: mockContext,
        } as never),
      ).toThrow('Cloudflare environment is not available');
    });

    it('should return brand name from Cloudflare env', () => {
      const mockContext = createMockContext({
        cloudflare: {
          env: {
            BRAND_NAME: 'UMAXICA',
          },
        },
      });

      const result = loader({
        context: mockContext,
      } as never);

      expect(result).toStrictEqual({ codeName: 'UMAXICA', message: '' });
    });
  });

  describe('Component', () => {
    it('should render the abstract corporate hero', () => {
      const markup = renderToStaticMarkup(
        <Home loaderData={{ codeName: 'Umaxica', message: 'Edge Blueprint' }} />,
      );

      expect(markup).toContain('Abstract Corporate Sample');
      expect(markup).toContain('Edge Blueprint');
      expect(markup).toContain('プロジェクトを描写する');
    });

    it('should render focus areas and perspectives', () => {
      const markup = renderToStaticMarkup(
        <Home loaderData={{ codeName: 'Umaxica', message: 'Hello' }} />,
      );

      expect(markup).toContain('Modular Platform');
      expect(markup).toContain('Experience Studio');
      expect(markup).toContain('Vision');
      expect(markup).toContain('静かな変革を、そっと始めませんか。');
    });

    it('should handle empty message', () => {
      const markup = renderToStaticMarkup(
        <Home loaderData={{ codeName: 'Umaxica', message: '' }} />,
      );

      expect(markup).toBeDefined();
      expect(markup.length).toBeGreaterThan(0);
      expect(markup).toContain('Sculpting Calm &amp; Capable Experiences');
    });
  });
});
