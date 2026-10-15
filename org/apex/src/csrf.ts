import { csrf } from 'hono/csrf';

import { isAllowedApexOrigin, isProductionApexEnvironment } from './host-policy';

// Host and origin allowlists share the same unit-derived policy. The CSRF
// middleware keeps the existing Hono origin check while the app-level Host
// guard rejects an unknown request target before any route or binding use.
export { isAllowedApexOrigin } from './host-policy';

export const apexCsrf = csrf({
  origin: (origin, c) =>
    isAllowedApexOrigin(origin, {
      allowLocalhost: !isProductionApexEnvironment(c.env),
    }),
});
