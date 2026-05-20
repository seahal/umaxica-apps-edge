import type { Route } from './+types/catch-all';
import { NotFoundPage } from './NotFoundPage';

export const handle = {
  breadcrumb: () => '404',
  titleName: '404 - ページが見つかりません',
};

export function meta(_: Route.MetaArgs) {
  return [
    { title: '404 - ページが見つかりません' },
    {
      content:
        'お探しのページは見つかりませんでした。URLを確認するか、ホームページから目的のページをお探しください。',
      name: 'description',
    },
    { content: 'noindex, nofollow', name: 'robots' },
  ];
}

export function loader(_: Route.LoaderArgs) {
  throw new Response('Not Found', {
    status: 404,
    statusText: 'ページが見つかりません',
  });
}

export default function CatchAll() {
  return <NotFoundPage />;
}
