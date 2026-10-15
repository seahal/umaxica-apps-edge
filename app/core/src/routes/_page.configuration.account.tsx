import { createFileRoute } from '@tanstack/react-router';

import { PageHeading } from '@/components/page-heading';
import { PageMain } from '@/components/page-main';
import { getDictionary } from '@/i18n/dictionaries';
import { pageTitle } from '@/lib/page-titles';

export const Route = createFileRoute('/_page/configuration/account')({
  loader: () => getDictionary(),
  head: () => ({ meta: [{ title: pageTitle('configuration_account') }] }),
  component: ConfigurationAccountPage,
});

function ConfigurationAccountPage() {
  const dict = Route.useLoaderData();

  return (
    <PageMain>
      <PageHeading>{dict.configuration_account.title}</PageHeading>
    </PageMain>
  );
}
