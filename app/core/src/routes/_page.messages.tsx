import { createFileRoute } from '@tanstack/react-router';

import { PageHeading } from '@/components/page-heading';
import { PageMain } from '@/components/page-main';
import { getDictionary } from '@/i18n/dictionaries';
import { pageTitle } from '@/lib/page-titles';

export const Route = createFileRoute('/_page/messages')({
  loader: () => getDictionary(),
  head: () => ({ meta: [{ title: pageTitle('messages') }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const dict = Route.useLoaderData();

  return (
    <PageMain>
      <PageHeading>{dict.messages.title}</PageHeading>
      <p className="max-w-prose text-gray-600">{dict.messages.wip}</p>
    </PageMain>
  );
}
