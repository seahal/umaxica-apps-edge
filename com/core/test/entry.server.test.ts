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

const handleRequest = (await import('../src/entry.server')).default;

it('handles com server entry requests', async () => {
  const request = new Request('https://com.example', {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
  });
  const responseHeaders = new Headers();
  const routerContext = { isSpaMode: false } as unknown as EntryContext;

  const contextMap = new Map<unknown, unknown>([
    [CloudflareContext, { security: { nonce: 'xyz789' } }],
  ]);

  const loadContext = {
    get: (key: unknown) => contextMap.get(key),
  } as unknown as AppLoadContext;

  const response = await handleRequest(request, 200, responseHeaders, routerContext, loadContext);

  expect(renderCalls.length).toBe(1);
  expect(response).toBeInstanceOf(Response);
  expect(responseHeaders.get('Content-Type')).toBe('text/html');
  expect(responseHeaders.get('Content-Security-Policy')).toContain('nonce-xyz789');
});

afterAll(() => {
  vi.restoreAllMocks();
});
