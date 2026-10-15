import { describe, expect, it, vi } from 'vitest';

import { getDictionary } from '../../src/i18n/dictionaries';
import { handleAppRequest } from '../../src/lib/app-request';
import { getLocale } from '../../src/paraglide/runtime';

/*
 * The application-document wrap: nonce + security headers around whatever the
 * renderer returns.
 *
 * `src/lib/app-handler.ts` is the wiring that supplies TanStack's fetch handler,
 * and it cannot be imported here — `createStartHandler` resolves only in the
 * Worker build. So the renderer is passed in. Rate limiting is `worker.ts`'s
 * job and is not in this function.
 */
const ok = () => Promise.resolve(new Response('<html></html>', { status: 200 }));

describe('handleAppRequest', () => {
  it('adds the security headers to whatever the renderer returns', async () => {
    const response = await handleAppRequest(new Request('http://localhost/'), ok, true);

    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });

  it('adds them to a 404 the renderer produced, where no route hook runs', async () => {
    const notFound = () => Promise.resolve(new Response('<html></html>', { status: 404 }));

    const response = await handleAppRequest(new Request('http://localhost/nope'), notFound, true);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('uses the production policy when told to, and the looser one when not', async () => {
    const production = await handleAppRequest(new Request('http://localhost/'), ok, true);
    const development = await handleAppRequest(new Request('http://localhost/'), ok, false);

    expect(production.headers.get('Content-Security-Policy')).not.toContain("'unsafe-eval'");
    expect(development.headers.get('Content-Security-Policy')).toContain("'unsafe-eval'");
  });

  /*
   * One mint per request, read twice: the policy must authorise the script the
   * document actually carries. A second `createNonce()` call for the header
   * would emit a policy that blocks the very script TanStack just stamped.
   */
  it('names one nonce in the policy per production request, and a fresh one each time', async () => {
    const first = await handleAppRequest(new Request('http://localhost/'), ok, true);
    const second = await handleAppRequest(new Request('http://localhost/'), ok, true);

    const nonceOf = (response: Response) =>
      /'nonce-([^']+)'/u.exec(response.headers.get('Content-Security-Policy') ?? '')?.[1];

    expect(nonceOf(first)).toBeDefined();
    expect(nonceOf(second)).toBeDefined();
    expect(nonceOf(first)).not.toBe(nonceOf(second));
  });

  // Development mints none: naming a nonce makes a browser ignore
  // 'unsafe-inline', which is what Vite's own injected scripts rely on.
  it('mints no nonce in development, where Vite injects scripts it cannot stamp', async () => {
    const response = await handleAppRequest(new Request('http://localhost/'), ok, false);

    expect(response.headers.get('Content-Security-Policy')).not.toContain('nonce-');
    expect(response.headers.get('Content-Security-Policy')).toContain("'unsafe-inline'");
  });

  it('runs the renderer for every request that reaches it', async () => {
    const render = vi.fn(ok);

    await handleAppRequest(new Request('http://localhost/'), render, true);

    expect(render).toHaveBeenCalledOnce();
  });

  it('keeps Paraglide locale and translated content isolated across concurrent requests', async () => {
    const render = async () => {
      const dictionary = await getDictionary();
      return new Response(`${getLocale()}|${dictionary.home.title}`);
    };

    const [english, japanese] = await Promise.all([
      handleAppRequest(
        new Request('http://localhost/', { headers: { 'x-edge-display-locale': 'en' } }),
        render,
        false,
      ),
      handleAppRequest(
        new Request('http://localhost/', { headers: { 'x-edge-display-locale': 'ja' } }),
        render,
        false,
      ),
    ]);

    await expect(english.text()).resolves.toBe('en|Home');
    await expect(japanese.text()).resolves.toBe('ja|ホーム');
  });
});
