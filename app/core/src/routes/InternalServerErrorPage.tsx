/* eslint-disable import/no-named-export, import/no-relative-parent-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { JSX } from 'react';
import { ErrorPage } from '../components/ErrorPage';

interface Props {
  details?: string;
  stack?: string;
  showDetails?: boolean;
}

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
      suggestion="しばらく時間をおいて再度お試しください。問題が継続する場合は、お気軽にお問い合わせください。"
      showNavigation
      showDetails={showDetails}
      {...(details ? { details } : {})}
      {...(stack ? { stack } : {})}
    />
  );
}
