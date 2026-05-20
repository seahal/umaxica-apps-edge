import { Timeline } from '../components/Timeline';
import { getEnv } from '../context';
import type { Route } from './+types/_index';

export function meta(_: Route.MetaArgs) {
  const codeName = _.data?.codeName || 'Umaxica';
  return [
    { title: `${codeName} (app)` },
    { content: 'Umaxica - 今何してる？', name: 'description' },
    { content: 'index, follow', name: 'robots' },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const message = env.VALUE_FROM_CLOUDFLARE ?? '';

  return {
    codeName: env.BRAND_NAME?.trim() || 'Umaxica',
    message,
  };
}

export default function Home(_: Route.ComponentProps) {
  return (
    <div className="bg-white dark:bg-gray-950">
      <Timeline />
    </div>
  );
}
