import { timeout } from 'hono/timeout';
import { createApexApp } from '../../../shared/apex/create-apex-app';
import { setMeta } from '../../../shared/apex/seo';
import { getAboutMeta, renderAboutContent } from './page-content';

const app = createApexApp(
  (pageRoutes) => {
    pageRoutes.get('/', timeout(2000), (c) => c.redirect('/about', 301));

    pageRoutes.get('/about', timeout(2000), (c) => {
      setMeta(c, getAboutMeta(c.env));
      return c.render(renderAboutContent(c.get('language')));
    });
  },
  { service: 'net' },
);

// Sentry: to re-enable, wrap app with Sentry.withSentry() and export the handler.
export default app;
