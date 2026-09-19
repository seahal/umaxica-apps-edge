import { createFileRoute } from '@tanstack/react-router';

import { brandTitle } from '@/lib/title';

/*
 * Outside `_page`, so it carries no application chrome. That is deliberate: a
 * recovery document with navigation in it is worse than one without
 * (`docs/design/ui-shell-contract.md` §15).
 *
 * This route remains reachable for the online HTTP contract. The service
 * worker's cached fallback is a fixed response from
 * `public/service-worker.js`, without request nonce, preference,
 * authentication or application shell state.
 */
export const Route = createFileRoute('/offline')({
  head: () => ({ meta: [{ title: brandTitle('オフライン') }] }),
  component: OfflinePage,
});

function OfflinePage() {
  return (
    <main className="grid min-h-screen place-content-center gap-3 p-6 text-center">
      <h1 className="text-2xl leading-heading font-semibold">オフラインです</h1>
      <p>ネットワーク接続を確認して再読み込みしてください。</p>
      <a
        className="inline-flex min-h-11 items-center justify-self-center rounded-full border border-gray-300 bg-white px-4 py-2 hover:bg-gray-100"
        href="/"
      >
        トップへ戻る
      </a>
    </main>
  );
}
