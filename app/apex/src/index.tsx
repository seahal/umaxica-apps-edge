import { timeout } from 'hono/timeout';
import { createApexApp } from '../../../shared/apex/create-apex-app';
import { setMeta } from '../../../shared/apex/seo';
import {
  buildRegionErrorPayload,
  getDefaultRedirectUrl,
  resolveRedirectUrl,
} from './root-redirect';
import { getAboutMeta, renderAboutContent } from './page-content';

const app = createApexApp(
  (pageRoutes) => {
    pageRoutes.get('/', (c) => {
      const regionParam = c.req.query('ri');

      const redirectUrl = resolveRedirectUrl(regionParam);
      if (redirectUrl) {
        return c.redirect(redirectUrl, 301);
      }

      const defaultRedirectUrl = getDefaultRedirectUrl();
      if (defaultRedirectUrl) {
        return c.redirect(defaultRedirectUrl, 301);
      }

      return c.json(buildRegionErrorPayload(), 400);
    });

    pageRoutes.get('/about', timeout(2000), (c) => {
      setMeta(c, getAboutMeta(c.env));
      return c.render(renderAboutContent(c.get('language')));
    });
  },
  { service: 'app' },
);

// Sentry: to re-enable, wrap app with Sentry.withSentry() and export the handler.
export default app;
