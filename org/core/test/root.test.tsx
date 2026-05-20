import type * as ReactRouter from 'react-router';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AppLoadContext } from 'react-router';
import { CloudflareContext } from '../src/context';
import type * as Root from '../src/root';

type RootModule = typeof Root;
type LoaderData = Awaited<ReturnType<RootModule['loader']>>;

let loaderDataOverride: LoaderData | undefined;
const isRouteErrorResponseMock = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => createElement('a', { href: to, ...rest }, children),
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
const { default: App, Layout, meta, ErrorBoundary, loader } = rootModule;

const baseLoaderData: LoaderData = {
  codeName: 'UMAXICA' as const,
  cspNonce: '',
  docsUrl: 'jp.docs.umaxica.org' as const,
  helpUrl: 'jp.help.umaxica.org' as const,
  newsUrl: 'jp.news.umaxica.org' as const,
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

describe('org root layout', () => {
  it('provides default meta title', () => {
    expect(meta()).toStrictEqual([{ title: 'Umaxica' }]);
  });

  it('renders the html shell with child content', () => {
    const markup = renderLayoutWithData({ cspNonce: 'nonce-123' });

    expect(markup).toContain('<vi-links');
    expect(markup).toContain('<vi-meta');
    expect(markup).toContain('child route');
  });
});

describe('org root route component', () => {
  it('renders an outlet placeholder for nested routes', () => {
    const element = App();
    expect(element.type).toBe(actualRouter.Outlet);
  });
});

describe('org root loader', () => {
  it('throws error when context is empty', () => {
    const loadContext = {
      get: () => {},
    } as unknown as AppLoadContext;

    expect(() => loader({ context: loadContext } as never)).toThrow(
      'Cloudflare environment is not available',
    );
  });

  it('returns values from environment variables', () => {
    const contextMap = new Map<unknown, unknown>([
      [
        CloudflareContext,
        {
          cloudflare: {
            env: {
              BRAND_NAME: 'TestBrand',
              DOCS_STAFF_URL: 'https://docs.example.com',
              HELP_STAFF_URL: 'https://help.example.com',
              NEWS_STAFF_URL: 'https://news.example.com',
            },
          },
          security: { nonce: 'test-nonce-123' },
        },
      ],
    ]);

    const loadContext = {
      get: (key: unknown) => contextMap.get(key),
    } as unknown as AppLoadContext;

    const result = loader({ context: loadContext } as never);

    expect(result.codeName).toBe('TestBrand');
    expect(result.cspNonce).toBe('test-nonce-123');
    expect(result.newsUrl).toBe('https://news.example.com');
    expect(result.docsUrl).toBe('https://docs.example.com');
    expect(result.helpUrl).toBe('https://help.example.com');
  });
});

describe('org root ErrorBoundary', () => {
  beforeEach(() => {
    isRouteErrorResponseMock.mockReset();
  });

  it('renders NotFoundPage for 404 errors', () => {
    const error = {
      data: null,
      status: 404,
      statusText: 'Not Found',
    };
    isRouteErrorResponseMock.mockReturnValue(true);

    const markup = renderToStaticMarkup(<ErrorBoundary error={error} />);
    expect(markup).toContain('ページが見つかりません');
    expect(markup).toContain('404');
  });

  it('renders InternalServerErrorPage for 500 errors', () => {
    const error = {
      data: null,
      status: 500,
      statusText: 'Internal Server Error',
    };
    isRouteErrorResponseMock.mockReturnValue(true);

    const markup = renderToStaticMarkup(<ErrorBoundary error={error} />);
    expect(markup).toContain('サーバーエラー');
    expect(markup).toContain('500');
  });

  it('renders ServiceUnavailablePage for 503 errors', () => {
    const error = {
      data: null,
      status: 503,
      statusText: 'Service Unavailable',
    };
    isRouteErrorResponseMock.mockReturnValue(true);

    const markup = renderToStaticMarkup(<ErrorBoundary error={error} />);
    expect(markup).toContain('メンテナンス中');
    expect(markup).toContain('503');
  });

  it('renders generic ErrorPage for other route errors', () => {
    const error = {
      data: null,
      status: 400,
      statusText: 'Bad Request',
    };
    isRouteErrorResponseMock.mockReturnValue(true);

    const markup = renderToStaticMarkup(<ErrorBoundary error={error} />);
    expect(markup).toContain('400 エラー');
    expect(markup).toContain('Bad Request');
  });

  it('renders InternalServerErrorPage for Error instances', () => {
    const error = new Error('Test error message');
    isRouteErrorResponseMock.mockReturnValue(false);

    const markup = renderToStaticMarkup(<ErrorBoundary error={error} />);
    expect(markup).toContain('サーバーエラー');
    expect(markup).toContain('500');
    // Note: The error message is passed as details but showDetails defaults to false
    // So the message is not visible in the rendered output
  });

  it('renders fallback ErrorPage for unknown errors', () => {
    isRouteErrorResponseMock.mockReturnValue(false);
    const markup = renderToStaticMarkup(<ErrorBoundary error="unknown error" />);
    expect(markup).toContain('予期しないエラー');
    expect(markup).toContain('500');
  });
});

afterAll(() => {
  loaderDataOverride = undefined;
  vi.restoreAllMocks();
});
