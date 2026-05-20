import { ErrorPage } from '../components/ErrorPage';

export function NotFoundPage() {
  return (
    <ErrorPage
      status={404}
      title="ページが見つかりません"
      message="お探しのページは存在しないか、移動または削除された可能性があります。"
      suggestion="URLを確認するか、ホームページから目的のページをお探しください。"
      showNavigation
    />
  );
}
