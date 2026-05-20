import { getEnv } from '../../context';
import type { Route } from '../+types/home';

export function meta(_: Route.MetaArgs) {
  return [{ content: 'Welcome to React Router!', name: 'description' }];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context);
  return {
    message: env.VALUE_FROM_CLOUDFLARE ?? '',
  };
}

export default function App(_: Route.ComponentProps) {
  return (
    <main className="p-4 container mx-auto">
      <h2>Message</h2>
      <p>underconstrution...</p>
    </main>
  );
}
