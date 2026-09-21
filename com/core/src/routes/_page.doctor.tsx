import { createFileRoute } from '@tanstack/react-router';

import { PageHeading } from '@/components/page-heading';
import { PageMain } from '@/components/page-main';
import { getDictionary } from '@/i18n/dictionaries';
import { pageTitle } from '@/lib/page-titles';

export const Route = createFileRoute('/_page/doctor')({
  loader: () => getDictionary(),
  head: () => ({ meta: [{ title: pageTitle('doctor') }] }),
  component: DoctorPage,
});

function DoctorPage() {
  const dict = Route.useLoaderData();

  return (
    <PageMain>
      <PageHeading>{dict.doctor.title}</PageHeading>
    </PageMain>
  );
}
