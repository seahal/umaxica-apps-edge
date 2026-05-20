import { index, layout, prefix, route } from '@react-router/dev/routes';
import type { RouteConfig } from '@react-router/dev/routes';

export default [
  route('health', 'routes/health.tsx'),
  layout('../src/layouts/decorated.tsx', [index('routes/_index.tsx')]),
  ...prefix('explore', [index('routes/explore/_index.tsx')]),
] satisfies RouteConfig;
