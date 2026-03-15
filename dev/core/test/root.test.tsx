import type * as ReactRouter from 'react-router';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type * as Root from '../src/root';

type RootModule = typeof Root;
type LoaderData = Awaited<ReturnType<RootModule['loader']>>;

let loaderDataOverride: LoaderData | undefined;

const isRouteErrorResponseMock = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Links: (props: Record<string, unknown>) => createElement('vi-links', props),
    Meta: (props: Record<string, unknown>) => createElement('vi-meta', props),
    Scripts: (props: Record<string, unknown>) => createElement('vi-scripts', props),
    ScrollRestoration: (props: Record<string, unknown>) => createElement('vi-scroll', props),
    isRouteErrorResponse: (error: unknown) => isRouteErrorResponseMock(error),
    useLoaderData: () => {
      if (!loaderDataOverride) {
        throw new Error('loader data override not set');
      }
      return loaderDataOverride;
    },
  };
});

const actualRouter = await vi.importActual<typeof ReactRouter>('react-router');

const rootModule = await import('../src/root');
const { default: App, Layout, links, ErrorBoundary, loader } = rootModule;

const baseLoaderData: LoaderData = {
  codeName: 'Umaxica Developers',
  cspNonce: '',
  docsServiceUrl: '',
  helpServiceUrl: '',
  newsServiceUrl: '',
};

function renderLayoutWithData(data: Partial<LoaderData> = {}) {
  loaderDataOverride = { ...baseLoaderData, ...data };
  const markup = renderToStaticMarkup(
    <Layout>
      <div>child route</div>
    </Layout>,
  );
  loaderDataOverride = undefined;
  return markup;
}

describe('dev_status root layout', () => {
  it('renders the html shell with child content', () => {
    const markup = renderLayoutWithData({ cspNonce: 'nonce-123' });

    expect(markup).toContain('<vi-links');
    expect(markup).toContain('<vi-meta');
    expect(markup).toContain('<vi-scroll nonce="nonce-123"');
    expect(markup).toContain('<vi-scripts nonce="nonce-123"');
    expect(markup).toContain('child route');
  });

  it('omits nonce attributes when loader data has no nonce', () => {
    const markup = renderLayoutWithData({ cspNonce: '' });
    expect(markup).not.toContain('nonce=""');
  });
});

describe('dev_status root links', () => {
  it('returns empty links array', () => {
    const result = links() as Awaited<ReturnType<typeof links>>;
    expect(result).toHaveLength(0);
  });
});

describe('dev_status root route component', () => {
  it('renders an outlet placeholder for nested routes', () => {
    const element = App();
    expect(element.type).toBe(actualRouter.Outlet);
  });
});

describe('dev_status root loader', () => {
  it('returns default fallback values when context is empty', () => {
    const result = loader({ context: {} } as never);

    expect(result.codeName).toBe('Umaxica Developers');
    expect(result.cspNonce).toBeDefined();
    expect(result.newsServiceUrl).toBe('');
    expect(result.docsServiceUrl).toBe('');
    expect(result.helpServiceUrl).toBe('');
  });

  it('uses provided nonce from context security', () => {
    const context = {
      security: {
        nonce: 'context-nonce-123',
      },
    };

    const result = loader({ context } as never);
    expect(result.cspNonce).toBe('context-nonce-123');
  });

  it('generates new nonce when not provided in context', () => {
    const context = {};

    const result = loader({ context } as never);
    expect(result.cspNonce).toBeDefined();
    expect(result.cspNonce.length).toBeGreaterThan(0);
  });

  it('reads environment variables from context.runtime.env', () => {
    const context = {
      runtime: {
        env: {
          BRAND_NAME: 'TestDevBrand',
          DOCS_SERVICE_URL: 'https://docs.test.com',
          HELP_SERVICE_URL: 'https://help.test.com',
          NEWS_SERVICE_URL: 'https://news.test.com',
          UMAXICA_APPS_EDGE_DEV_CORE_SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
          SENTRY_ENVIRONMENT: 'local-dev',
        },
      },
    };

    const result = loader({ context } as never);
    expect(result.codeName).toBe('TestDevBrand');
    expect(result.helpServiceUrl).toBe('https://help.test.com');
    expect(result.docsServiceUrl).toBe('https://docs.test.com');
    expect(result.newsServiceUrl).toBe('https://news.test.com');
  });

  it('trims environment variable values', () => {
    const context = {
      runtime: {
        env: {
          BRAND_NAME: '  TestBrand  ',
        },
      },
    };

    const result = loader({ context } as never);
    expect(result.codeName).toBe('TestBrand');
  });

  it('stores nonce in context.security when context exists', () => {
    const context: { security?: { nonce?: string } } = {};

    const result = loader({ context } as never);
    expect(context.security?.nonce).toBe(result.cspNonce);
  });

  it('stores nonce in existing context.security when nonce not present', () => {
    const context = {
      security: { nonce: undefined as string | undefined },
    };

    const result = loader({ context } as never);
    expect(context.security.nonce).toBe(result.cspNonce);
  });
});

describe('dev_status root ErrorBoundary', () => {
  beforeEach(() => {
    isRouteErrorResponseMock.mockReset();
  });

  it('renders 404 message for route error with status 404', () => {
    const error = {
      data: null,
      status: 404,
      statusText: 'Not Found',
    };
    isRouteErrorResponseMock.mockReturnValue(true);

    const markup = renderToStaticMarkup(<ErrorBoundary error={error} />);
    expect(markup).toContain('404');
    expect(markup).toContain('The requested page could not be found');
  });

  it('renders generic error message for other route errors', () => {
    const error = {
      data: null,
      status: 500,
      statusText: 'Internal Server Error',
    };
    isRouteErrorResponseMock.mockReturnValue(true);

    const markup = renderToStaticMarkup(<ErrorBoundary error={error} />);
    expect(markup).toContain('Error');
    expect(markup).toContain('Internal Server Error');
  });

  it('shows error details in DEV mode for Error instances', () => {
    const error = new Error('Test error message');
    error.stack = 'Error: Test error message\n    at test.ts:1:1';
    isRouteErrorResponseMock.mockReturnValue(false);
    const originalDev = import.meta.env.DEV;
    (import.meta.env as { DEV: boolean }).DEV = true;

    const markup = renderToStaticMarkup(<ErrorBoundary error={error} />);
    expect(markup).toContain('Oops!');
    expect(markup).toContain('Test error message');
    expect(markup).toContain('Error: Test error message');

    (import.meta.env as { DEV: boolean }).DEV = originalDev;
  });

  it('shows generic message for Error instances in non-DEV mode', () => {
    const error = new Error('Test error message');
    isRouteErrorResponseMock.mockReturnValue(false);
    const originalDev = import.meta.env.DEV;
    (import.meta.env as { DEV: boolean }).DEV = false;

    const markup = renderToStaticMarkup(<ErrorBoundary error={error} />);
    expect(markup).toContain('Oops!');
    expect(markup).toContain('An unexpected error occurred');

    (import.meta.env as { DEV: boolean }).DEV = originalDev;
  });

  it('renders fallback for unknown error types', () => {
    isRouteErrorResponseMock.mockReturnValue(false);
    const markup = renderToStaticMarkup(<ErrorBoundary error="unknown" />);
    expect(markup).toContain('Oops!');
    expect(markup).toContain('An unexpected error occurred');
  });
});

afterAll(() => {
  loaderDataOverride = undefined;
  vi.restoreAllMocks();
});
