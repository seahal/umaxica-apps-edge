// Relative, not `@/`: the repository-level title guard imports this file from
// outside the unit, where the unit's path alias does not resolve.
import { defaultLocale, type Locale } from '../i18n/config';

/*
 * The 429 document, and the key the limiter counts against.
 *
 * `checkRateLimit` returns a bare document: `src/worker.ts` puts the security
 * headers on it, in the same place it puts them on every other response it
 * answers itself. A 429 is a full HTML document an attacker can elicit on
 * demand, so it must not be the one page on this origin served without a CSP,
 * an `X-Frame-Options` or a `nosniff` — which is what it was when this function
 * returned a finished response.
 */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/*
 * One literal document per locale. The wording is the status-page vocabulary
 * every family uses for a refused request. This module does not decide the
 * locale: `src/worker.ts` passes the Core's existing display-locale contract
 * (`resolveDisplayLocale`: `lx`, then the `language` cookie, then the default),
 * so rate limiting has no locale precedence of its own.
 */
const RATE_LIMITED_DOCUMENTS: Record<Locale, string> = {
  ja:
    '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">' +
    '<title>リクエストを処理できませんでした — UMAXICA (APP)</title></head>' +
    '<body><main><h1>リクエストを処理できませんでした</h1><p>HTTP 429</p>' +
    '<a href="/">トップへ戻る</a></main></body></html>',
  en:
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<title>The request could not be processed — UMAXICA (APP)</title></head>' +
    '<body><main><h1>The request could not be processed</h1><p>HTTP 429</p>' +
    '<a href="/">Back to top</a></main></body></html>',
};

export function rateLimitedResponse(locale: Locale = defaultLocale): Response {
  return new Response(RATE_LIMITED_DOCUMENTS[locale], {
    status: 429,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=UTF-8' },
  });
}

/*
 * The bucket a request with no `CF-Connecting-IP` counts against.
 *
 * Cloudflare sets that header on every request it forwards, so in production
 * this fallback is unreachable. It is reachable in `vite dev`, in `vite preview`
 * and on any future path that reaches this Worker without going through the
 * edge — and the previous spelling, `|| 'unknown'`, put every such request into
 * ONE shared bucket. A shared bucket is both a bypass (many clients sharing one
 * budget is only a restriction if they are the same client) and a denial of
 * service against everyone else in it: one caller can spend the whole budget and
 * lock out every other unattributable request.
 *
 * Keying by pathname instead keeps the fallback per-path rather than global. It
 * is deliberately NOT a fallthrough that skips the limiter: an unattributable
 * request is still counted, just not counted together with unrelated ones.
 */
function rateLimitKey(request: Request): string {
  const ip = request.headers.get('cf-connecting-ip');
  if (ip !== null && ip !== '') {
    return ip;
  }

  return `no-ip:${new URL(request.url).pathname}`;
}

/*
 * `locale` is a thunk so the caller's resolution runs only for a request that
 * was actually refused, and never before the limiter has answered.
 */
export async function checkRateLimit(
  request: Request,
  rateLimiter: RateLimiter | undefined,
  locale: () => Locale = () => defaultLocale,
): Promise<Response | null> {
  if (!rateLimiter) return null;

  const { success } = await rateLimiter.limit({ key: rateLimitKey(request) });
  return success ? null : rateLimitedResponse(locale());
}
