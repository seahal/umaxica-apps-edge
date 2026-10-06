import { createFileRoute } from '@tanstack/react-router';

import { PageHeading } from '@/components/page-heading';
import { PageMain } from '@/components/page-main';
import { getDictionary } from '@/i18n/dictionaries';
import { pageTitle } from '@/lib/page-titles';

/*
 * `_page.configuration.index.tsx`, not `_page.configuration.tsx`.
 *
 * TanStack's flat routing reads `a.b.tsx` as a CHILD of `a.tsx` when both exist,
 * so a file named `_page.configuration.tsx` becomes the parent route of
 * `_page.configuration.account.tsx` — and this component renders a `<PageMain>`
 * with no `<Outlet />`, so the account page silently never rendered. The URL and
 * the title were still right, which is what made it invisible: measured only
 * because coverage showed the account component at 60%.
 *
 * The `index` suffix makes this the leaf that answers `/configuration` exactly,
 * and leaves the two routes as siblings.
 */
export const Route = createFileRoute('/_page/configuration/')({
  loader: () => getDictionary(),
  head: () => ({ meta: [{ title: pageTitle('configuration') }] }),
  component: ConfigurationPage,
});

function ConfigurationPage() {
  const dict = Route.useLoaderData();

  return (
    <PageMain>
      <PageHeading>{dict.configuration.title}</PageHeading>
    </PageMain>
  );
}
