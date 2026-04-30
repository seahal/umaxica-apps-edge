import { buildApexTitle, createPageContent } from '../page-content';

describe('page-content', () => {
  describe('buildApexTitle', () => {
    it('builds title with page name', () => {
      const env = {} as never;
      const result = buildApexTitle(env, 'test', 'About');
      expect(result).toBe('About | UMAXICA (test) - Apex');
    });

    it('builds title without page name', () => {
      const env = {} as never;
      const result = buildApexTitle(env, 'test');
      expect(result).toBe('UMAXICA (test) - Apex');
    });
  });

  describe('createPageContent', () => {
    const mockConfig = {
      domain: 'app',
      tld: 'umaxica.app',
      aboutDescription: 'Test description',
      aboutCanonicalUrl: 'https://umaxica.app/about',
      aboutRobots: 'index,follow',
      renderAboutContent: (language: string | undefined) => ({ language }),
    };

    it('returns correct config properties', () => {
      const result = createPageContent(mockConfig);

      expect(result.ABOUT_CANONICAL_URL).toBe('https://umaxica.app/about');
      expect(result.ABOUT_ROBOTS).toBe('index,follow');
      expect(result.renderAboutContent).toBe(mockConfig.renderAboutContent);
    });

    it('buildApexTitle is bound to the domain', () => {
      const result = createPageContent(mockConfig);
      const env = {} as never;

      const titleWithPage = result.buildApexTitle(env, 'Home');
      expect(titleWithPage).toBe('Home | UMAXICA (app) - Apex');

      const titleWithoutPage = result.buildApexTitle(env);
      expect(titleWithoutPage).toBe('UMAXICA (app) - Apex');
    });

    it('getAboutMeta returns correct metadata', () => {
      const result = createPageContent(mockConfig);
      const env = {} as never;

      const meta = result.getAboutMeta(env);
      expect(meta.title).toBe('About | UMAXICA (app) - Apex');
      expect(meta.description).toBe('Test description');
      expect(meta.canonical).toBe('https://umaxica.app/about');
      expect(meta.robots).toBe('index,follow');
    });
  });
});
