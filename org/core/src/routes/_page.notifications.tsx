import { createFileRoute } from '@tanstack/react-router';

import { PageHeading } from '@/components/page-heading';
import { PageMain } from '@/components/page-main';
import { getDictionary } from '@/i18n/dictionaries';
import { pageTitle } from '@/lib/page-titles';

export const Route = createFileRoute('/_page/notifications')({
  loader: () => getDictionary(),
  head: () => ({ meta: [{ title: pageTitle('notifications') }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const dict = Route.useLoaderData();

  return (
    <PageMain>
      <PageHeading>{dict.notifications.title}</PageHeading>
      <p className="max-w-prose text-gray-600">{dict.notifications.wip}</p>
    </PageMain>
  );
}
