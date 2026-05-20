import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LoaderData } from '../src/root';

let loaderDataOverride: LoaderData | undefined;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'ja', dir: () => 'ltr', changeLanguage: vi.fn() },
    t: (key: string) => key,
  }),
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    data: (body: unknown) => body,
    Links: (props: Record<string, unknown>) => createElement('vi-links', props),
    Meta: (props: Record<string, unknown>) => createElement('vi-meta', props),
    Scripts: (props: Record<string, unknown>) => createElement('vi-scripts', props),
    ScrollRestoration: (props: Record<string, unknown>) => createElement('vi-scroll', props),
    useLoaderData: () => {
      if (!loaderDataOverride) {
        throw new Error('loader data override not set');
      }
      return loaderDataOverride;
    },
  };
});

vi.mock('../src/middleware/i18next', () => ({
  getLocale: () => 'ja',
  getInstance: () => undefined,
  i18nextMiddleware: (_args: unknown, next: () => unknown) => next(),
  localeCookie: { serialize: () => Promise.resolve('lng=ja') },
}));

const rootModule = await import('../src/root');
const { default: App, Layout, meta } = rootModule;

const baseLoaderData: LoaderData = {
  apexServiceUrl: '',
  apiServiceUrl: '',
  codeName: '',
  cspNonce: '',
  docsServiceUrl: '',
  edgeServiceUrl: '',
  helpServiceUrl: '',
  locale: 'ja',
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

afterAll(() => {
  loaderDataOverride = undefined;
  vi.restoreAllMocks();
});

describe('root layout shell', () => {
  it('provides an empty title by default', () => {
    expect(meta({} as never)).toStrictEqual([{ title: '' }]);
  });

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

describe('root route component', () => {
  it('renders an outlet placeholder for nested routes', () => {
    loaderDataOverride = baseLoaderData;
    const markup = renderToStaticMarkup(<App loaderData={baseLoaderData} />);
    loaderDataOverride = undefined;

    expect(markup).toBeDefined();
  });
});
