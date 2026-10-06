import { createFileRoute } from '@tanstack/react-router';

import { brandTitle } from '../lib/title';

/*
 * This online route remains ordinary for direct links and the HTTP contract.
 * The service worker's offline fallback is a fixed response from
 * `public/service-worker.js`, so the cached document has no request nonce,
 * preference, authentication or application shell state.
 *
 * Locale-less, like the failure documents: it is fetched once, before anyone
 * knows which language the failed navigation was in, so it speaks the default
 * locale.
 */
export const Route = createFileRoute('/offline')({
  head: () => ({
    meta: [{ title: brandTitle('オフライン') }, { name: 'robots', content: 'noindex, nofollow' }],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  return (
    <main
      className="grid flex-1 place-content-center gap-3 p-6 text-center"
      id="main-content"
      tabIndex={-1}
    >
      <h1 className="text-2xl leading-heading font-semibold">オフラインです</h1>
      <p>ネットワーク接続を確認して再読み込みしてください。</p>
      <a
        className="inline-flex min-h-11 items-center justify-self-center rounded-full border border-gray-300 bg-white px-4 py-2 hover:bg-gray-100"
        href="/ja/"
      >
        トップへ戻る
      </a>
    </main>
  );
}
