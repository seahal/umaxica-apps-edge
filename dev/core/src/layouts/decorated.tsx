import { Outlet, useRouteLoaderData } from 'react-router';

import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { loader as rootLoader } from '../root';

type RootLoaderData = Awaited<ReturnType<typeof rootLoader>>;

export default function DecoratedLayout() {
  const loaderData = useRouteLoaderData('root') as RootLoaderData | undefined;

  const {
    codeName = '',
    helpServiceUrl = '',
    docsServiceUrl = '',
    newsServiceUrl = '',
  } = loaderData ?? {};

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        codeName={codeName}
        helpServiceUrl={helpServiceUrl}
        docsServiceUrl={docsServiceUrl}
        newsServiceUrl={newsServiceUrl}
      />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer codeName={codeName} />
    </div>
  );
}
