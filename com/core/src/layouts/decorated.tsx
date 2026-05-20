import { Outlet, useRouteLoaderData } from 'react-router';

import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { loader as rootLoader } from '../root';

type RootLoaderData = Awaited<ReturnType<typeof rootLoader>>;

export default function DecoratedLayout() {
  const loaderData = useRouteLoaderData('root') as RootLoaderData | undefined;

  const {
    codeName = '',
    newsServiceUrl = '',
    docsServiceUrl = '',
    helpServiceUrl = '',
  } = loaderData ?? {};

  return (
    <>
      <Header
        codeName={codeName}
        newsServiceUrl={newsServiceUrl}
        docsServiceUrl={docsServiceUrl}
        helpServiceUrl={helpServiceUrl}
      />
      <Outlet />
      <Footer codeName={codeName} />
    </>
  );
}
