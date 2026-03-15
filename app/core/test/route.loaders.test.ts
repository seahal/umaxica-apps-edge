import { CloudflareContext } from '../src/context';
import { loader as homeLoader, meta as homeMeta } from '../src/routes/_index';
import {
  loader as authenticationLoader,
  meta as authenticationMeta,
} from '../src/routes/authentication/_index';
import { loader as catchAllLoader, meta as catchAllMeta } from '../src/routes/catch-all';
import {
  loader as configurationLoader,
  meta as configurationMeta,
} from '../src/routes/configurations/_index';
import { loader as exploreLoader } from '../src/routes/explore/_index';
import { loader as messagesLoader } from '../src/routes/messages/_index';
import { loader as notificationsLoader } from '../src/routes/notifications/_index';

function createMockContext(env: Record<string, unknown>) {
  const contextMap = new Map<unknown, unknown>([
    [
      CloudflareContext,
      {
        cloudflare: { env },
      },
    ],
  ]);

  return {
    cloudflare: {
      ctx: {} as unknown,
      env,
    },
    get: (key: unknown) => contextMap.get(key),
    set: () => {},
  };
}

async function runLoader<T extends (...args: unknown[]) => unknown>(
  loader: T,
  env: Record<string, unknown>,
) {
  const mockContext = createMockContext(env);
  const result = loader({
    context: mockContext,
    params: {},
    request: new Request('https://example.com'),
  } as Parameters<T>[0]);
  return await result;
}

describe('route loader coverage harness', () => {
  it('home loader returns empty message when VALUE_FROM_CLOUDFLARE is missing', async () => {
    const result = await runLoader(homeLoader as never, {});
    expect(result).toStrictEqual({ codeName: 'Umaxica', message: '' });
  });

  it.each([
    ['home index', homeLoader as never, 'VALUE_FROM_CLOUDFLARE'],
    ['authentication index', authenticationLoader as never, 'VALUE_FROM_CLOUDFLARE'],
    ['configuration index', configurationLoader as never, 'SECRET_SAMPLE'],
    ['explore index', exploreLoader as never, 'VALUE_FROM_CLOUDFLARE'],
    ['messages index', messagesLoader as never, 'VALUE_FROM_CLOUDFLARE'],
    ['notifications index', notificationsLoader as never, 'VALUE_FROM_CLOUDFLARE'],
  ] as const)(
    '%s loader returns the expected Cloudflare-derived message',
    async (_, loader, envKey) => {
      const message = `test-message:${envKey}`;
      const result = await runLoader(loader, { [envKey]: message });
      if (loader === (homeLoader as never)) {
        expect(result).toStrictEqual({ codeName: 'Umaxica', message });
        return;
      }
      expect(result).toStrictEqual({ message });
    },
  );
});

describe('route meta implementations', () => {
  it('home meta advertises the Japanese homepage', () => {
    const [title, description, robots] = homeMeta({
      data: { codeName: 'Umaxica' },
      matches: [],
      params: {},
      request: new Request('https://example.com'),
    } as never);
    expect(title).toMatchObject({ title: 'Umaxica (app)' });
    expect(description).toMatchObject({
      content: 'Umaxica - 今何してる？',
      name: 'description',
    });
    expect(robots).toMatchObject({
      content: 'index, follow',
      name: 'robots',
    });
  });

  it('authentication meta opts users into login copy', () => {
    const metaEntries = authenticationMeta({
      matches: [],
      params: {},
      request: new Request('https://example.com/authentication'),
    } as never);
    expect(metaEntries).toContainEqual({
      title: 'Umaxica - 認証',
    });
    expect(metaEntries).toContainEqual({
      content: '認証ページ',
      name: 'description',
    });
  });

  it('configuration meta highlights account settings', () => {
    const metaEntries = configurationMeta({
      matches: [],
      params: {},
      request: new Request('https://example.com/configuration'),
    } as never);
    expect(metaEntries).toContainEqual({ title: 'Umaxica - 設定' });
    expect(metaEntries).toContainEqual({
      content: 'アカウントと環境設定',
      name: 'description',
    });
  });

  it('catch-all meta discourages indexing of missing pages', () => {
    const metaEntries = catchAllMeta({
      matches: [],
      params: {},
      request: new Request('https://example.com/missing'),
    } as never);
    expect(metaEntries).toContainEqual({
      title: '404 - ページが見つかりません',
    });
    expect(metaEntries).toContainEqual({
      content: 'noindex, nofollow',
      name: 'robots',
    });
  });
});

describe('catch-all loader', () => {
  it('throws a 404 response that explains the missing page', () => {
    let caughtError: unknown;
    try {
      const mockContext = createMockContext({});
      catchAllLoader({
        context: mockContext,
        params: {},
        request: new Request('https://example.com/not-found'),
      } as Parameters<typeof catchAllLoader>[0]);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Response);
    const response = caughtError as Response;
    expect(response.status).toBe(404);
    expect(response.statusText).toBe('ページが見つかりません');
  });
});
