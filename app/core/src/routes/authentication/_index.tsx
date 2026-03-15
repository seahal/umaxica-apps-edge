import { getEnv } from '../../context';
import type { Route } from '../+types/_index';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Umaxica - 認証' }, { content: '認証ページ', name: 'description' }];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context);
  return {
    message: env.VALUE_FROM_CLOUDFLARE ?? '',
  };
}

export default function Authentication(_: Route.ComponentProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">認証</h1>
        <p className="text-gray-600 dark:text-gray-400">
          外部の認証サービス（
          <a
            href="https://auth.umaxica.app"
            className="text-blue-500 hover:underline dark:text-blue-400"
            rel="noopener"
          >
            auth.umaxica.app
          </a>
          ）に接続します
        </p>
      </div>
    </div>
  );
}
