/*
 * First-touch rate limiting for this content surface, and the 429 document it
 * answers with.
 *
 * `adr/010-first-touch-rate-limiting.md` puts the limiter at whatever this unit's
 * first-touch hook is. The three Cores call it from `src/worker.ts`; this unit has
 * no `worker.ts`, so `src/middleware.ts` is that hook — the same asymmetry ADR 010
 * records, carried across the move from TanStack Start to Astro (adr/015).
 *
 * The limiter is a parameter rather than a module-scope `env` read. That keeps this
 * file free of `cloudflare:workers`, which matters twice: `src/middleware.ts` is
 * loaded by the prerender build as well as by the Worker, and the root
 * `test/html-title-contract.test.ts` guard drives this function directly with an
 * injected limiter, exactly as it drives the Cores and the apex Workers.
 *
 * There is no path matcher and none is needed: with `output: 'static'` Cloudflare
 * serves prerendered HTML and hashed assets from the asset layer without invoking
 * the Worker at all, so only the on-demand routes reach this code. That is also
 * why `run_worker_first` stays unset — turning it on would invoke the Worker for
 * every asset request, converting free static-asset serving into billed
 * invocations.
 *
 * An absent binding is a no-op: `astro dev` has no rate limiter bound, and a local
 * loop that rate-limited itself would be a worse contract than one that does not.
 */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

const RATE_LIMITED_DOCUMENT =
  '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">' +
  '<title>リクエストを処理できませんでした — UMAXICA (APP)</title></head>' +
  '<body><main><h1>リクエストを処理できませんでした</h1><p>HTTP 429</p>' +
  '<a href="/">トップへ戻る</a></main></body></html>';

/*
 * A bare document. `src/middleware.ts` stamps the security headers on it, in the
 * same place it stamps them on every other response this unit answers. A 429 is a
 * full HTML document an attacker can elicit on demand, so it must not be the one
 * page on this origin served without a CSP, an `X-Frame-Options` or a `nosniff`.
 */
export function rateLimitedResponse(): Response {
  return new Response(RATE_LIMITED_DOCUMENT, {
    status: 429,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=UTF-8' },
  });
}

/*
 * The bucket a request with no `CF-Connecting-IP` counts against.
 *
 * Cloudflare sets that header on every request it forwards, so in production this
 * fallback is unreachable. It is reachable in `astro dev`, in `wrangler dev` and on
 * any future path that reaches this Worker without going through the edge — and the
 * obvious spelling, `|| 'unknown'`, would put every such request into ONE shared
 * bucket. A shared bucket is both a bypass (many clients sharing one budget is only
 * a restriction if they are the same client) and a denial of service against
 * everyone else in it: one caller can spend the whole budget and lock out every
 * other unattributable request.
 *
 * Keying by pathname instead keeps the fallback per-path rather than global. It is
 * deliberately NOT a fallthrough that skips the limiter: an unattributable request
 * is still counted, just not counted together with unrelated ones.
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
 */
export async function checkRateLimit(
  request: Request,
  rateLimiter: RateLimiter | undefined,
): Promise<Response | null> {
  if (!rateLimiter) return null;

  const { success } = await rateLimiter.limit({ key: rateLimitKey(request) });
  return success ? null : rateLimitedResponse();
}
