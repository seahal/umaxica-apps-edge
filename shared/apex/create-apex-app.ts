import { Hono } from 'hono';
import { etag } from 'hono/etag';
import { HTTPException } from 'hono/http-exception';
import { languageDetector } from 'hono/language';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { apexCsrf } from './csrf';
import { renderHealthJson, renderHealthPage } from './health-page';
import { checkRateLimit } from './rate-limit';
import { renderer } from './renderer';
import { applySecurityHeaders, type AssetEnv } from './security-headers';
import type { Meta } from './seo';

export type ApexEnv = {
  Bindings: AssetEnv;
  Variables: {
    meta?: Meta;
  };
};

type ConfigurePageRoutes = (pageRoutes: Hono<ApexEnv>) => void;

type CreateApexAppOptions = {
  service: string;
};

function badRequest() {
  return new Response('Bad Request', { status: 400 });
}

function notFound() {
  return new Response('Not Found', { status: 404 });
}

export function createApexApp(
  configurePageRoutes: ConfigurePageRoutes,
  options: CreateApexAppOptions,
) {
  const app = new Hono<ApexEnv>();
  const pageRoutes = new Hono<ApexEnv>();

  app.use(etag());
  app.use(logger());
  app.use(async (c, next) => {
    const blocked = await checkRateLimit(c.req.raw, c.env?.RATE_LIMITER);
    if (blocked) return blocked;
    await next();
  });
  app.use('*', apexCsrf);
  app.use('*', async (c, next) => {
    await next();
    applySecurityHeaders(c);
  });
  app.use(languageDetector({ supportedLanguages: ['en', 'ja'], fallbackLanguage: 'en' }));

  pageRoutes.use(renderer);
  configurePageRoutes(pageRoutes);

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }

    // oxlint-disable-next-line no-console
    console.error('Unhandled apex error', {
      method: c.req.method,
      url: c.req.url,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return badRequest();
  });

  app.get('/health', timeout(2000), (c) => renderHealthPage(c.env, options));
  app.get('/health.html', timeout(2000), (c) => renderHealthPage(c.env, options));
  app.get('/health.json', timeout(2000), (c) => renderHealthJson(c.env, options));
  app.route('/', pageRoutes);
  app.notFound(notFound);

  return app;
}
