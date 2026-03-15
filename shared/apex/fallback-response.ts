<<<<<<< HEAD
=======
import type { Context } from 'hono';
>>>>>>> f779cd0 ([update] began to use Vite+.)
import type { AssetEnv } from './security-headers';

type FallbackStatus = 400 | 404;
type FallbackContext = {
  env?: Pick<AssetEnv, 'ASSETS'>;
  req: {
    raw: Request;
    url: string;
  };
  text: (text: string, status: FallbackStatus) => Response;
};

async function fetchHtmlFallback(
  c: FallbackContext,
  path: string,
  status: FallbackStatus,
  fallbackText: string,
) {
  if (!c.env?.ASSETS) {
<<<<<<< HEAD
    // oxlint-disable-next-line no-console
=======
    // eslint-disable-next-line no-console
>>>>>>> f779cd0 ([update] began to use Vite+.)
    console.error(`ASSETS binding is missing for ${status} fallback`, { url: c.req.url });
    return c.text(fallbackText, status);
  }

  const url = new URL(path, c.req.url);
  const res = await c.env.ASSETS.fetch(new Request(url.toString()));
  return new Response(res.body, {
    status,
    headers: res.headers,
  });
}

export function createBadRequestFallback(c: FallbackContext) {
  return fetchHtmlFallback(c, '/400.html', 400, 'Bad Request');
}

<<<<<<< HEAD
export async function createNotFoundFallback(c: FallbackContext) {
  if (!c.env?.ASSETS) {
    // oxlint-disable-next-line no-console
=======
export async function createNotFoundFallback(c: ApexContext) {
  if (!c.env?.ASSETS) {
    // eslint-disable-next-line no-console
>>>>>>> f779cd0 ([update] began to use Vite+.)
    console.error('ASSETS binding is missing for 404 fallback', { url: c.req.url });
    return c.text('Not Found', 404);
  }

  const assetRes = await c.env.ASSETS.fetch(c.req.raw);
  if (assetRes.status !== 404) {
    return assetRes;
  }

  return fetchHtmlFallback(c, '/404.html', 404, 'Not Found');
}
