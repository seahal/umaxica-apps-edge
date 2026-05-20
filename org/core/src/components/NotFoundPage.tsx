/* eslint-disable import/no-named-export */
import type { JSX } from 'react';
import { ErrorPage } from './ErrorPage';

export function NotFoundPage(): JSX.Element {
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
