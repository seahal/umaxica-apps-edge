import { EventList } from '../components/EventList';
import { getEnv } from '../context';
import type { Route } from './+types/_index';

export function meta(_: Route.MetaArgs) {
  const codeName = _.data?.codeName || 'Umaxica';
  return [
    { title: `${codeName} (org)` },
    { content: 'コミュニティイベントに参加しましょう', name: 'description' },
    { content: 'index, follow', name: 'robots' },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context) as unknown as Record<string, string | undefined>;
  return {
    codeName: env.BRAND_NAME?.trim() || 'Umaxica',
    message: env.VALUE_FROM_CLOUDFLARE,
  };
}

export default function Home(_: Route.ComponentProps) {
  return <EventList />;
}
