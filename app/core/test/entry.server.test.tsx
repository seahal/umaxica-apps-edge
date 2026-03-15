/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function */
import type * as ReactDOMServer from 'react-dom/server';
import type { EntryContext } from 'react-router';

import { CloudflareContext } from '../src/context';

const actualDomServer = await vi.importActual<typeof ReactDOMServer>('react-dom/server');

type RenderOptions = Parameters<typeof actualDomServer.renderToReadableStream>[1];

let awaitedAllReady = false;
let lastOptions: RenderOptions | undefined;
let renderCalls: unknown[][] = [];

function createStream() {
  awaitedAllReady = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.close();
    },
  });
  Object.assign(stream, {
    // eslint-disable-next-line promise/avoid-new
    allReady: new Promise<void>((resolve) => {
      resolve();
      awaitedAllReady = true;
    }),
  });
  return stream as ReadableStream & { allReady: Promise<void> };
}

let renderImplementation: (...args: unknown[]) => ReturnType<typeof createStream> = (...args) => {
  renderCalls.push(args);
  lastOptions = args[1] as RenderOptions;
  return createStream();
};

vi.mock('react-dom/server', () => ({
  renderToReadableStream: (...args: unknown[]) => renderImplementation(...args),
}));

let isBot = false;
vi.mock('isbot', () => ({
  isbot: () => isBot,
}));

const handleRequest = (await import('../src/entry.server')).default;

afterEach(() => {
  renderCalls = [];
  lastOptions = undefined;
  renderImplementation = (...args) => {
    renderCalls.push(args);
    lastOptions = args[1] as RenderOptions;
    return createStream();
  };
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('entry.server handleError', () => {
  let handleError: any;

  beforeEach(async () => {
    const module = await import('../src/entry.server');
    handleError = module.handleError;
  });

  it('logs error when request is not aborted', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('test error');
    const request = new Request('https://example.com', { signal: AbortSignal.timeout(1000) });

    handleError(error, { request, params: {}, context: {} });

    expect(consoleSpy).toHaveBeenCalledWith(error);

    consoleSpy.mockRestore();
  });

  it('does not log when request is aborted', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('test error');
    const controller = new AbortController();
    controller.abort();
    const request = new Request('https://example.com', { signal: controller.signal });

    handleError(error, { request, params: {}, context: {} });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('entry.server handleRequest', () => {
  let headers: Headers;

  beforeEach(() => {
    headers = new Headers();
  });

  it('renders html for bots and sets security headers', async () => {
    isBot = true;
    const request = new Request('https://example.com', {
      headers: { 'user-agent': 'Googlebot' },
    });
    const routerContext = {
      isSpaMode: false,
    } as unknown as EntryContext;

    const contextMap = new Map<any, any>([
      [CloudflareContext, { security: { nonce: 'nonce-123' } }],
    ]);
    const loadContext = {
      cloudflare: {
        ctx: {} as ExecutionContext,
        env: {} as Env,
      },
      get: (key: any) => contextMap.get(key),
      set: () => {},
    } as any;

    const response = await handleRequest(request, 200, headers, routerContext, loadContext);

    expect(renderCalls.length).toBe(1);
    expect(awaitedAllReady).toBeTruthy();
    expect(lastOptions?.nonce).toBe('nonce-123');
    expect(response.headers.get('Content-Type')).toBe('text/html');
    expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(response.headers.get('Content-Security-Policy')).toContain('nonce-nonce-123');
    expect(response.headers.get('Permissions-Policy')).toContain('microphone=()');
  });

  it('waits for all content in SPA mode even for non-bot agents', async () => {
    isBot = false;
    const request = new Request('https://example.com/app', {
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    const routerContext = {
      isSpaMode: true,
    } as unknown as EntryContext;

    const contextMap = new Map<any, any>();
    const loadContext = {
      cloudflare: {
        ctx: {} as ExecutionContext,
        env: {} as Env,
      },
      get: (key: any) => contextMap.get(key),
      set: () => {},
    } as any;

    await handleRequest(request, 200, headers, routerContext, loadContext);

    expect(awaitedAllReady).toBeTruthy();
  });

  it('escalates to 500 when onError is called after shell render', async () => {
    isBot = false;
    const request = new Request('https://example.com/error');
    const routerContext = {
      isSpaMode: false,
    } as unknown as EntryContext;
    // oxlint-disable no-console
    const originalConsoleError = console.error;
    const errorCalls: unknown[][] = [];
    // eslint-disable-next-line no-console
    console.error = (...args: unknown[]) => {
      errorCalls.push(args);
    };

    renderImplementation = (...args) => {
      renderCalls.push(args);
      const options = args[1] as RenderOptions | undefined;
      const stream = createStream();
      setTimeout(() => {
        options?.onError?.(new Error('stream failure'), {});
      }, 0);
      // eslint-disable-next-line no-promise-executor-return
      return stream;
    };

    try {
      const contextMap = new Map<any, any>();
      const loadContext = {
        cloudflare: {
          ctx: {} as ExecutionContext,
          env: {} as Env,
        },
        get: (key: any) => contextMap.get(key),
        set: () => {},
      } as any;
      await handleRequest(request, 200, headers, routerContext, loadContext);
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(errorCalls.length).toBeGreaterThan(0);
      expect(errorCalls[0]?.[0]).toBeInstanceOf(Error);
    } finally {
      // oxlint-disable no-console
      console.error = originalConsoleError;
    }
  });
});
