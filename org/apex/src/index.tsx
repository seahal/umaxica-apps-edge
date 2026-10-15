/** @jsxImportSource hono/jsx */
import { createApexApp } from './create-apex-app';
import { getAboutMeta, renderAboutContent } from './page-content';
import { getDefaultRedirectUrl, resolveRedirectUrl } from './root-redirect';
import { setMeta } from './seo';

// `/` redirects with 302, not the pre-ADR-024 301: browsers cache a 301 without
// bound, so a later change of the regional target would not reach them. See
// adr/027-reintroduce-app-com-org-apex-units.md.
const app = createApexApp((pageRoutes) => {
  pageRoutes.get('/', (c) => {
    const regionParam = c.req.query('ri');
    const redirectUrl = resolveRedirectUrl(regionParam);
    if (redirectUrl) {
      return c.redirect(redirectUrl, 302);
    }
    // Always a URL: the default region is a constant key of `allowedUrls`.
    // There is deliberately no rejection branch. An unrecognised `ri` is not
    // an error to report back — it is a value that fails the allowlist, and
    // the safe answer is the default region rather than a 400 that tells a
    // prober its guess was parsed.
    return c.redirect(getDefaultRedirectUrl(), 302);
  });

  pageRoutes.get('/about', (c) => {
    setMeta(c, getAboutMeta(c.env, c.get('language')));
    return c.render(renderAboutContent(c.get('language')));
  });
});

export default app;
