import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';
import { structuredLogger } from '@hono/structured-logger';
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
import { getAboutMeta, getRootMeta, renderAboutContent, renderRootContent } from './page-content';
import { renderer } from './renderer';

import type { ApexBindings } from '../../../shared/apex/bindings';

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
  createRootRoute('page', renderer, {
    getRootMeta,
    renderRootContent,
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

  if (c.req.path === '/health') {
    return handleHealthError(c as unknown as Parameters<typeof handleHealthError>[0]);
  }

  return c.text('Internal Server Error', 500);
});

// Not found handler
app.notFound((c) =>
  createNotFoundFallback(c as unknown as Parameters<typeof createNotFoundFallback>[0]),
);

export { app };
