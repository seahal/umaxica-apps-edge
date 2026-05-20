import { ErrorPage } from './ErrorPage';

// 404エラー専用コンポーネント
// この部分は404エラー表示の責務: ページが見つからない場合の専用UI
// テストではこう確認する: 404専用のメッセージとリンクが正しく表示されるかをテスト
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
