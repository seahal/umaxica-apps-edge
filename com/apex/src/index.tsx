import { Hono } from 'hono';
<<<<<<< HEAD
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';
import { structuredLogger } from '@hono/structured-logger';
=======
import { apexCsrf } from '../../../shared/apex/csrf';
import {
  createBadRequestFallback,
  createNotFoundFallback,
} from '../../../shared/apex/fallback-response';
import { renderHealthPage } from '../../../shared/apex/health-page';
import { etag } from 'hono/etag';
import { HTTPException } from 'hono/http-exception';
import { languageDetector } from 'hono/language';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { checkRateLimit } from '../../../shared/apex/rate-limit';
import { applySecurityHeaders, type AssetEnv } from '../../../shared/apex/security-headers';
import { setMeta } from '../../../shared/apex/seo';
>>>>>>> f779cd0 ([update] began to use Vite+.)
import {
  etagMiddleware,
  rateLimitMiddleware,
  apexCsrfMiddleware,
  securityHeadersMiddleware,
  i18nMiddleware,
} from '../../../shared/apex/middleware';
import {
  createAboutRoute,
  createRootRoute,
  createHealthRoute,
  handleHealthError,
} from '../../../shared/apex/routes';
import { createNotFoundFallback } from '../../../shared/apex/html/fallback-pages';
import { createRootRedirect } from '../../../shared/apex/root-redirect';
import { getAboutMeta, renderAboutContent } from './page-content';
import { renderer } from './renderer';

<<<<<<< HEAD
import type { ApexBindings } from '../../../shared/apex/bindings';

const { resolveRedirectUrl, getDefaultRedirectUrl, buildRegionErrorPayload } =
  createRootRedirect('umaxica.com');

const app = new Hono<ApexBindings>();

app.use('*', requestId());
app.use(
  '*',
  structuredLogger({
    createLogger: () => console,
    onRequest: (logger, c) => {
      logger.info(
        {
          method: c.req.method,
          path: c.req.path,
          requestId: c.get('requestId'),
        },
        'request start',
      );
    },
    onResponse: (logger, c, elapsedMs) => {
      logger.info(
        {
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          requestId: c.get('requestId'),
          elapsedMs,
        },
        'request end',
      );
    },
    onError: (logger, err, c) => {
      logger.error(
        {
          err,
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          requestId: c.get('requestId'),
        },
        'request error',
      );
    },
  }),
);
=======
const app = new Hono<{ Bindings: AssetEnv }>();
const pageRoutes = new Hono<{ Bindings: AssetEnv }>();

app.use(etag());
app.use(logger());
app.use(async (c, next) => {
  const blocked = await checkRateLimit(c.req.raw, c.env?.RATE_LIMITER);
  if (blocked) return blocked;
  await next();
});
app.use('*', (c, next) =>
  apexCsrf(c as unknown as Parameters<typeof apexCsrf>[0], next as Parameters<typeof apexCsrf>[1]),
);
app.use('*', async (c, next) => {
  await next();
  if (c.res.status !== 400 && c.res.status !== 404) {
    applySecurityHeaders(c);
  }
});
app.use(languageDetector({ supportedLanguages: ['en', 'ja'], fallbackLanguage: 'en' }));
>>>>>>> f779cd0 ([update] began to use Vite+.)

// Shared middleware
app.use(etagMiddleware() as unknown as Parameters<typeof app.use>[0]);
app.use(rateLimitMiddleware() as unknown as Parameters<typeof app.use>[0]);
app.use('*', apexCsrfMiddleware() as unknown as Parameters<typeof app.use>[1]);
app.use('*', securityHeadersMiddleware() as unknown as Parameters<typeof app.use>[1]);
app.use(i18nMiddleware() as unknown as Parameters<typeof app.use>[0]);

// Routes
app.route('/', createHealthRoute() as unknown as Parameters<typeof app.route>[1]);

app.route(
  '/',
  createRootRoute('redirect', renderer, {
    resolveRedirectUrl,
    getDefaultRedirectUrl,
    buildRegionErrorPayload,
  }) as unknown as Parameters<typeof app.route>[1],
);
app.route(
  '/',
  createAboutRoute(renderer, { getAboutMeta, renderAboutContent }) as unknown as Parameters<
    typeof app.route
  >[1],
);

// Error handler
app.onError(async (err, c) => {
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

<<<<<<< HEAD
  if (c.req.path === '/health') {
    return handleHealthError(c as unknown as Parameters<typeof handleHealthError>[0]);
  }

  return c.text('Internal Server Error', 500);
});

// Not found handler
app.notFound((c) =>
  createNotFoundFallback(c as unknown as Parameters<typeof createNotFoundFallback>[0]),
);

=======
  return createBadRequestFallback(c as unknown as Parameters<typeof createBadRequestFallback>[0]);
});

app.get('/health', timeout(2000), (c) =>
  renderHealthPage(c.env as unknown as Parameters<typeof renderHealthPage>[0]),
);

app.route('/', pageRoutes);
app.notFound(createNotFoundFallback as unknown as Parameters<typeof app.notFound>[0]);

// Sentry: to re-enable, wrap app with Sentry.withSentry() and export the handler.
>>>>>>> f779cd0 ([update] began to use Vite+.)
export default app;
