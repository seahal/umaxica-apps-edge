import { Outlet, useRouteLoaderData } from 'react-router';

import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { loader as rootLoader } from '../root';

type RootLoaderData = Awaited<ReturnType<typeof rootLoader>>;

export default function DecoratedLayout() {
  const loaderData = useRouteLoaderData('root') as RootLoaderData | undefined;

  const { codeName = '', helpUrl = '', docsUrl = '', newsUrl = '' } = loaderData ?? {};

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        codeName={codeName}
        helpServiceUrl={helpUrl}
        docsServiceUrl={docsUrl}
        newsServiceUrl={newsUrl}
      />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer codeName={codeName} />
    </div>
  );
}
