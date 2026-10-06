import { brandTitle } from './title';

/*
 * First-touch rate limiting for this content unit, and the 429 document it
 * answers with.
 *
 * `adr/010-first-touch-rate-limiting.md` puts the limiter at whatever this unit's
 * first-touch hook is. The three Cores call it from `src/worker.ts`; this unit
 * calls it from `src/request-handler.ts`, before the router runs.
 *
 * The limiter is a parameter rather than a module-scope `env` read. That keeps
 * this file free of `cloudflare:workers`, so the root
 * `test/html-title-contract.test.ts` guard can drive it directly with an
 * injected limiter, exactly as it drives the Cores and the apex Workers.
 *
 * An absent binding is a no-op: `vite dev` has no rate limiter bound, and a
 * local loop that rate-limited itself would be a worse contract than one that
 * does not.
 */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/*
 * The two languages this unit speaks. Declared here as a literal union rather
 * than imported from `src/i18n.ts`, which pulls in the generated message
 * catalog: this file has to stay importable on its own.
 */
export type RateLimitLocale = 'ja' | 'en';

/*
 * The wording is the status-page vocabulary every family uses for a refused
 * request, in the locale the caller resolved. This module does not decide the
 * locale — `src/request-handler.ts` does, from the URL contract that already
 * exists (`/{lang}/…`) — so rate limiting has no locale precedence of its own.
 */
const RATE_LIMITED_COPY: Record<RateLimitLocale, { heading: string; home: string }> = {
  ja: { heading: 'リクエストを処理できませんでした', home: 'トップへ戻る' },
  en: { heading: 'The request could not be processed', home: 'Back to top' },
};

function rateLimitedDocument(locale: RateLimitLocale): string {
  const { heading, home } = RATE_LIMITED_COPY[locale];
  return (
    `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8">` +
    `<title>${brandTitle(heading)}</title></head>` +
    `<body><main><h1>${heading}</h1><p>HTTP 429</p>` +
    `<a href="/${locale}/">${home}</a></main></body></html>`
  );
}

/*
 * A bare document. `src/request-handler.ts` stamps the security headers on it, in
 * the same place it stamps them on every other response this unit answers. A 429
 * is a full HTML document an attacker can elicit on demand, so it must not be the
 * one page on this origin served without a CSP, an `X-Frame-Options` or a
 * `nosniff`.
 */
export function rateLimitedResponse(locale: RateLimitLocale = 'ja'): Response {
  return new Response(rateLimitedDocument(locale), {
    status: 429,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=UTF-8' },
  });
}

/*
 * The bucket a request with no `CF-Connecting-IP` counts against.
 *
 * Cloudflare sets that header on every request it forwards, so in production this
 * fallback is unreachable. It is reachable in `vite dev`, in `wrangler dev` and on
 * any future path that reaches this Worker without going through the edge — and
 * the obvious spelling, `|| 'unknown'`, would put every such request into ONE
 * shared bucket: both a bypass and a denial of service against everyone else in
 * it. Keying by pathname keeps the fallback per-path rather than global. It is
 * deliberately NOT a fallthrough that skips the limiter.
 */
function rateLimitKey(request: Request): string {
  const ip = request.headers.get('cf-connecting-ip');
  if (ip !== null && ip !== '') {
    return ip;
  }

  return `no-ip:${new URL(request.url).pathname}`;
}

/**
 * Returns the 429 document when the limiter refuses, and `null` when the request
 * may proceed — including when no limiter is bound at all.
 *
 * `locale` is a thunk so the caller's resolution runs only for a request that
 * was actually refused, and never before the limiter has answered.
 */
export async function checkRateLimit(
  request: Request,
  rateLimiter: RateLimiter | undefined,
  locale: () => RateLimitLocale = () => 'ja',
): Promise<Response | null> {
  if (!rateLimiter) return null;

  const { success } = await rateLimiter.limit({ key: rateLimitKey(request) });
  return success ? null : rateLimitedResponse(locale());
}
