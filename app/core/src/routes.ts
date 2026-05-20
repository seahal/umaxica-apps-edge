import { index, layout, prefix, route } from '@react-router/dev/routes';
import type { RouteConfig } from '@react-router/dev/routes';

export default [
  route('health', 'routes/health.tsx'),
  layout('../src/layouts/decorated.tsx', [
    index('routes/_index.tsx'),
    ...prefix('configuration', [
      index('routes/configurations/_index.tsx'),
      route('account', 'routes/configurations/account.tsx'),
      route('preference', 'routes/configurations/preference.tsx'),
    ]),
    ...prefix('message', [index('routes/messages/_index.tsx')]),
    ...prefix('notification', [index('routes/notifications/_index.tsx')]),
    ...prefix('explore', [index('routes/explore/_index.tsx')]),
    ...prefix('authentication', [index('routes/authentication/_index.tsx')]),
  ]),
] satisfies RouteConfig;
