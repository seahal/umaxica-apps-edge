import { index, layout, route } from '@react-router/dev/routes';
import type { RouteConfig } from '@react-router/dev/routes';

export default [
  layout('../src/layouts/decorated.tsx', [
    index('routes/home.tsx'),
    route('about', 'routes/about.tsx'),
    route('health', 'routes/health.tsx'),
    route('*', 'routes/catch-all.tsx'),
  ]),
] satisfies RouteConfig;
