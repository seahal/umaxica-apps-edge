import { loader } from '../src/root';

interface LoaderContext {
  runtime?: { env?: Record<string, string> };
  security?: { nonce?: string };
}

function runLoader(context: LoaderContext) {
  return loader({ context } as unknown as Parameters<typeof loader>[0]);
}

describe('dev root loader', () => {
  it('maps environment values for header/footer configuration', () => {
    const result = runLoader({
      runtime: {
        env: {
          BRAND_NAME: 'Umaxica Dev Hub',
          DOCS_SERVICE_URL: 'docs.dev.umaxica.app',
          HELP_SERVICE_URL: 'help.dev.umaxica.app',
          NEWS_SERVICE_URL: 'news.dev.umaxica.app',
          UMAXICA_APPS_EDGE_DEV_CORE_SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
          SENTRY_ENVIRONMENT: 'preview',
        },
      },
      security: { nonce: 'test-nonce' },
    });

    expect(result).toMatchObject({
      codeName: 'Umaxica Dev Hub',
      cspNonce: 'test-nonce',
      docsServiceUrl: 'docs.dev.umaxica.app',
      helpServiceUrl: 'help.dev.umaxica.app',
      newsServiceUrl: 'news.dev.umaxica.app',
    });
  });

  it('generates a nonce when not provided', () => {
    const context: LoaderContext = {};
    const result = runLoader(context);

    expectTypeOf(result.cspNonce).toBeString();
    expect(result.cspNonce.length).toBeGreaterThan(0);
    expect(context.security?.nonce).toBe(result.cspNonce);
  });

  it('maps environment values from runtime.env (Vercel-compatible path)', () => {
    const result = runLoader({
      runtime: {
        env: {
          BRAND_NAME: 'Umaxica Dev Runtime',
          DOCS_SERVICE_URL: 'https://docs.runtime.dev',
          HELP_SERVICE_URL: 'https://help.runtime.dev',
          NEWS_SERVICE_URL: 'https://news.runtime.dev',
          UMAXICA_APPS_EDGE_DEV_CORE_SENTRY_DSN: 'https://public@example.ingest.sentry.io/2',
          SENTRY_ENVIRONMENT: 'staging',
        },
      },
      security: { nonce: 'runtime-nonce' },
    });

    expect(result).toMatchObject({
      codeName: 'Umaxica Dev Runtime',
      cspNonce: 'runtime-nonce',
      docsServiceUrl: 'https://docs.runtime.dev',
      helpServiceUrl: 'https://help.runtime.dev',
      newsServiceUrl: 'https://news.runtime.dev',
    });
  });
});
