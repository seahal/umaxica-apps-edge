import { createFileRoute } from '@tanstack/react-router';

import { PageHeading } from '@/components/page-heading';
import { PageMain } from '@/components/page-main';
import { getDictionary } from '@/i18n/dictionaries';
import { BRAND_TITLE } from '@/lib/title';

/*
 * The one page whose title is the bare brand. Next expressed this as the root
 * layout's `metadata.title.default`, which every page inherited unless it
 * declared its own; the index was the only one that never did. There is no
 * inheritance here — the root route contributes no title at all, or documents
 * would carry two — so the index states it.
 */
export const Route = createFileRoute('/_page/')({
  loader: () => getDictionary(),
  head: () => ({ meta: [{ title: BRAND_TITLE }] }),
  component: IndexPage,
});

function IndexPage() {
  const dict = Route.useLoaderData();

  return (
    <PageMain>
      <PageHeading>{dict.home.title}</PageHeading>
      <p className="max-w-prose text-lg">{dict.home.description}</p>
    </PageMain>
  );
}
