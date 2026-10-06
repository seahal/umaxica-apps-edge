import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The cache half of the Vite build, pinned where it is actually decided.
 *
 * Cloudflare serves static assets as `public, max-age=0, must-revalidate`
 * unless told otherwise, so an unhashed stylesheet was revalidated on every
 * document this unit served. Building through Vite puts a content hash in the
 * filename, and `public/_headers` is what turns that hash into a cache win.
 *
 * This reads the policy file rather than a build output on purpose: `dist/` is
 * absent in a clean checkout and the `test` CI job does not build, so a test
 * that reached into it would pass vacuously exactly when it mattered. The
 * hashing itself is Vite's guarantee and is exercised by `pnpm run build`; what
 * is ours, and what a careless edit could silently drop, is these two rules.
 */
describe('static asset cache policy', () => {
  const headers = readFileSync(resolve(import.meta.dirname, '..', 'public/_headers'), 'utf8');

  it('marks the hashed build output immutable', () => {
    expect(headers).toMatch(/^\/assets\/\*$/mu);
    expect(headers).toMatch(/^\s+Cache-Control: public, max-age=31536000, immutable$/mu);
  });

  /*
   * `/assets/*` must not widen to `/*`. Everything in `public/` is served under
   * its own unhashed name, so an immutable copy of one of those could not be
   * corrected — a wrong favicon or manifest would be pinned in browser caches
   * for a year with no URL change available to break it.
   */
  it('does not mark unhashed assets immutable', () => {
    // `_headers` is URL-pattern lines at column 0, each followed by indented
    // `Name: value` lines. Comments are skipped explicitly: this file explains
    // itself at length, and the word "immutable" appears in that prose.
    const immutableRules = headers
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
      .reduce<{ current: string | null; matched: string[] }>(
        (state, line) => {
          if (line.startsWith('/')) return { current: line.trim(), matched: state.matched };
          if (/^\s+Cache-Control:.*\bimmutable\b/u.test(line) && state.current !== null) {
            return { current: state.current, matched: [...state.matched, state.current] };
          }
          return state;
        },
        { current: null, matched: [] },
      ).matched;

    expect(immutableRules).toEqual(['/assets/*']);
  });

  /*
   * The service worker policy was removed with apex offline support. Keep this
   * suite focused on hashed Vite assets.
   */
});

/*
 * `src/assets.ts` picks the stylesheet URL by build mode, and only one of its
 * two branches can run in a given process — so each is reached here by stubbing
 * the flag and re-importing, which is the only way a build-time constant
 * becomes testable at all.
 *
 * What these assert is the SUFFIX DECISION, not a path. Vitest resolves
 * `./style.css?url` to an empty string: it runs neither the Vite build that
 * emits a hashed asset nor the dev server that serves the source. So the URL
 * itself is only observable over HTTP, which is where `api/*.hurl` checks it.
 * The decision — append `?direct` in dev, never in a build — is observable
 * here, and it is the part a careless edit would get wrong.
 *
 * Neither branch is cosmetic. The dev one is what stops the stylesheet being
 * served as `text/javascript` and silently not applying; the built one is what
 * leaves the content hash intact for the cache policy above.
 */
describe('stylesheet URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('asks the dev server for the compiled CSS rather than the CSS module', async () => {
    vi.stubEnv('DEV', true);
    vi.resetModules();
    const { styleUrl } = await import('../src/assets');
    expect(styleUrl.endsWith('?direct')).toBe(true);
  });

  it('leaves the emitted asset path unchanged in a build', async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const { styleUrl } = await import('../src/assets');
    expect(styleUrl).not.toContain('?direct');
  });
});
