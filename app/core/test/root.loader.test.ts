import { CloudflareContext } from '../src/context';

vi.mock('../src/middleware/i18next', () => ({
  getLocale: () => 'ja',
  getInstance: () => undefined,
  i18nextMiddleware: (_args: unknown, next: () => unknown) => next(),
  localeCookie: { serialize: () => Promise.resolve('lng=ja') },
}));

const { loader } = await import('../src/root');

interface LoaderContext {
  cloudflare?: { env?: Record<string, string> };
  security?: { nonce?: string };
}

function createMockContext(data: LoaderContext) {
  const contextMap = new Map<unknown, unknown>([[CloudflareContext, data]]);

  return {
    get: (key: unknown) => contextMap.get(key),
  };
}

async function runLoader(context: LoaderContext) {
  const mockContext = createMockContext(context);
  const result = await loader({ context: mockContext } as unknown as Parameters<typeof loader>[0]);
  if (result instanceof Response) {
    return result.json() as Promise<Record<string, unknown>>;
  }
  const wrapped = result as unknown as { data?: Record<string, unknown> };
  return (wrapped.data ?? result) as unknown as Record<string, unknown>;
}

describe('root loader', () => {
  it('maps Cloudflare env values into loader data', async () => {
    const result = await runLoader({
      cloudflare: {
        env: {
          APEX_SERVICE_URL: 'umaxica.app',
          API_SERVICE_URL: 'api.umaxica.app',
          BRAND_NAME: 'Project Nova',
          DOCS_SERVICE_URL: 'docs.umaxica.app',
          EDGE_SERVICE_URL: 'edge.umaxica.app',
          HELP_SERVICE_URL: 'support.umaxica.app',
          NEWS_SERVICE_URL: 'news.umaxica.app',
        },
      },
      security: { nonce: 'csp-nonce' },
    });
    expect(result).toMatchObject({
      apexServiceUrl: 'umaxica.app',
      apiServiceUrl: 'api.umaxica.app',
      codeName: 'Project Nova',
      cspNonce: 'csp-nonce',
      docsServiceUrl: 'docs.umaxica.app',
      edgeServiceUrl: 'edge.umaxica.app',
      helpServiceUrl: 'support.umaxica.app',
      locale: 'ja',
      newsServiceUrl: 'news.umaxica.app',
    });
  });
});
