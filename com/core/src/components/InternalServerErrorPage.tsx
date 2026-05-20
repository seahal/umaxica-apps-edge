import { ErrorPage } from './ErrorPage';

interface Props {
  details?: string;
  stack?: string;
  showDetails?: boolean;
}

// 500エラー専用コンポーネント
// この部分は500エラー表示の責務: サーバーエラー発生時の専用UI
// テストではこう確認する: 500専用のメッセージが表示され、適切な対処法が示されるかをテスト
export function InternalServerErrorPage({
  details,
  stack,
  showDetails = false,
}: Props): React.JSX.Element {
  return (
    <ErrorPage
      status={500}
      title="サーバーエラー"
      message="申し訳ございません。サーバーで予期しないエラーが発生しました。"
      suggestion="しばらく時間をおいて再度お試しください。問題が継続する場合は、お問い合わせフォームからご連絡ください。"
      showNavigation
      showDetails={showDetails}
      {...(details ? { details } : {})}
      {...(stack ? { stack } : {})}
    />
  );
}
