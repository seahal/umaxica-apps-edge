import { isNotFound } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UI } from '../src/i18n';
import { getRouter } from '../src/router';
import { siteCopy } from '../src/lib/site-copy';
import { Route as entriesRoute } from '../src/routes/$lang.entries.index';
import { Route as entryRoute } from '../src/routes/$lang.entries.$publicId';
import { Route as localeRoute } from '../src/routes/$lang';
import { Route as pageRoute } from '../src/routes/$lang.entries.page.$page';
import { Route as searchRoute } from '../src/routes/$lang.search';
import { renderDocument, runLoader } from './utils/routes';
import { resetEnv, setEnv } from './__mocks__/cloudflare-workers';

afterEach(resetEnv);

type SearchOptions = {
  parseSearch: (value: string) => Record<string, string>;
  stringifySearch: (value: Record<string, unknown>) => string;
};

type HeadContext = {
  params: Record<string, string>;
  loaderData: unknown;
};

function routeHead(route: { options: unknown }, context: HeadContext) {
  const options = route.options as { head?: (value: HeadContext) => unknown };
  return options.head?.(context);
}

function caughtNotFound(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('route parameter and search boundaries', () => {
  it('accepts and round-trips only the supported locale route parameter', () => {
    const params = (
      localeRoute as unknown as {
        options: {
          params: {
            parse: (value: { lang: string }) => { lang: string };
            stringify: (value: { lang: string }) => { lang: string };
          };
        };
      }
    ).options.params;

    expect(params.parse({ lang: 'ja' })).toEqual({ lang: 'ja' });
    expect(params.parse({ lang: 'en' })).toEqual({ lang: 'en' });
    expect(isNotFound(caughtNotFound(() => params.parse({ lang: 'fr' })))).toBe(true);
    expect(params.stringify({ lang: 'en' })).toEqual({ lang: 'en' });
  });

  it('keeps search values as strings and drops non-string values', () => {
    const { options } = getRouter() as unknown as { options: SearchOptions };

    expect(options.parseSearch('q=123&empty=')).toEqual({ q: '123', empty: '' });
    expect(options.stringifySearch({ q: '123', page: 2, enabled: true })).toBe('?q=123');
    expect(options.stringifySearch({ page: 2 })).toBe('');

    const validateSearch = (
      searchRoute as unknown as {
        options: { validateSearch: (search: Record<string, unknown>) => { q?: string } };
      }
    ).options.validateSearch;
    expect(validateSearch({ q: 'query', ignored: 1 })).toEqual({ q: 'query' });
    expect(validateSearch({ q: 123 })).toEqual({});
  });

  it('keeps route head functions safe before loader data is available', () => {
    expect(routeHead(entriesRoute, { params: { lang: 'ja' }, loaderData: undefined })).toEqual({});
    expect(routeHead(pageRoute, { params: { lang: 'ja', page: '2' }, loaderData: undefined })).toEqual(
      {},
    );
    expect(
      routeHead(entryRoute, { params: { lang: 'ja', publicId: '01ABC' }, loaderData: undefined }),
    ).toEqual({});

    const pendingSearchHead = routeHead(searchRoute, {
      params: { lang: 'ja' },
      loaderData: undefined,
    }) as { meta: { name?: string; content?: string }[] };
    expect(pendingSearchHead.meta).not.toContainEqual({ name: 'robots', content: 'noindex, follow' });
  });
});

describe('route components and loader signals', () => {
  it.each(['ja', 'en'] as const)('renders the %s about component from this surface copy', async (lang) => {
    const html = await renderDocument(`/${lang}/about/`);
    expect(html).toContain(UI[lang].about);
    expect(html).toContain(siteCopy(lang).aboutParagraphs[0] ?? '');
  });

  it('renders the locale-less offline document', async () => {
    const html = await renderDocument('/offline');
    expect(html).toContain('オフラインです');
    expect(html).toContain('ネットワーク接続を確認して再読み込みしてください。');
  });

  it('renders a generic unavailable page when Rails fails a pagination request', async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response('private upstream diagnostic', { status: 500 })),
    );
    setEnv({ UMAXICA_APPS_EDGE_CF_WORKERS_VPC: { fetch } });

    const html = await renderDocument('/ja/entries/page/2/');

    expect(html).toContain(UI.ja.unavailableHeading);
    expect(html).toContain('HTTP 502');
    expect(html).not.toContain('private upstream diagnostic');
  });

  it('turns Rails-clamped collection and pagination pages into not-found signals', async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(
        Response.json({ data: [], page: { current: 2, previous: 1, next: null, last: 3 } }),
      ),
    );
    setEnv({ UMAXICA_APPS_EDGE_CF_WORKERS_VPC: { fetch } });

    const collectionFailure = await runLoader(entriesRoute, { lang: 'ja' }).catch(
      (error: unknown) => error,
    );
    expect(isNotFound(collectionFailure)).toBe(true);

    const pageFailure = await runLoader(pageRoute, { lang: 'ja', page: '4' }).catch(
      (error: unknown) => error,
    );
    expect(isNotFound(pageFailure)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
