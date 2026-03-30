import type { AppLoadContext, EntryContext } from 'react-router';
import { CloudflareContext } from '../src/context';

const renderCalls: unknown[][] = [];

vi.mock('react-dom/server', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    renderToReadableStream: (...args: unknown[]) => {
      renderCalls.push(args);
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      return Object.assign(stream, {
        allReady: Promise.resolve(),
      });
    },
  };
});

vi.mock('isbot', () => ({
  isbot: () => false,
}));

vi.mock('../src/middleware/i18next', () => ({
  getInstance: vi.fn().mockReturnValue(null),
}));

const handleRequest = (await import('../src/entry.server')).default;
const handleError = (await import('../src/entry.server')).handleError;

describe('app entry.server handleError', () => {
  it('logs error when request is not aborted', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('test error');
    const request = new Request('https://example.com', { signal: AbortSignal.timeout(1000) });

    handleError(error, { request });

    expect(consoleSpy).toHaveBeenCalledWith(error);

    consoleSpy.mockRestore();
  });

  it('does not log when request is aborted', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('test error');
    const controller = new AbortController();
    controller.abort();
    const request = new Request('https://example.com', { signal: controller.signal });

    handleError(error, { request });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('app entry.server handleRequest', () => {
  let headers: Headers;

  beforeEach(() => {
    headers = new Headers();
  });

  it('handles app server entry requests', async () => {
    const request = new Request('https://app.umaxica.com', {
      headers: {
        'user-agent': 'Mozilla/5.0',
      },
    });
    const routerContext = { isSpaMode: false } as unknown as EntryContext;

    const contextMap = new Map<unknown, unknown>([
      [CloudflareContext, { security: { nonce: 'xyz789' } }],
    ]);

    const loadContext = {
      get: (key: unknown) => contextMap.get(key),
    } as unknown as AppLoadContext;

    const response = await handleRequest(request, 200, headers, routerContext, loadContext);

    expect(renderCalls.length).toBe(1);
    expect(response).toBeInstanceOf(Response);
    expect(headers.get('Content-Type')).toBe('text/html');
    expect(headers.get('Content-Security-Policy')).toContain('nonce-xyz789');
  });

  it('handles requests without user-agent', async () => {
    const request = new Request('https://app.umaxica.com');
    const routerContext = { isSpaMode: false } as unknown as EntryContext;

    const contextMap = new Map<unknown, unknown>([
      [CloudflareContext, { security: { nonce: 'abc123' } }],
    ]);

    const loadContext = {
      get: (key: unknown) => contextMap.get(key),
    } as unknown as AppLoadContext;

    const response = await handleRequest(request, 200, headers, routerContext, loadContext);

    expect(response).toBeInstanceOf(Response);
  });

  it('handles SPA mode requests', async () => {
    const request = new Request('https://app.umaxica.com/app', {
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    const routerContext = { isSpaMode: true } as unknown as EntryContext;

    const contextMap = new Map<unknown, unknown>([
      [CloudflareContext, { security: { nonce: 'spa123' } }],
    ]);

    const loadContext = {
      get: (key: unknown) => contextMap.get(key),
    } as unknown as AppLoadContext;

    const response = await handleRequest(request, 200, headers, routerContext, loadContext);

    expect(response).toBeInstanceOf(Response);
  });

  it('handles requests with empty nonce object', async () => {
    const request = new Request('https://app.umaxica.com', {
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    const routerContext = { isSpaMode: false } as unknown as EntryContext;

    const contextMap = new Map<unknown, unknown>([[CloudflareContext, { security: {} }]]);

    const loadContext = {
      get: (key: unknown) => contextMap.get(key),
    } as unknown as AppLoadContext;

    const response = await handleRequest(request, 200, headers, routerContext, loadContext);

    expect(response).toBeInstanceOf(Response);
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
