import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { RouteAnnouncer } from '@/components/route-announcer';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { ErrorDocument, NotFoundDocument } from '@/components/status-documents';
import { getLocale } from '@/paraglide/runtime';

import '../i18n/paraglide-client';

import styleUrl from '../globals.css?url';

export const Route = createRootRoute({
  /*
   * There is deliberately NO title here.
   *
   * `<HeadContent />` renders the head tags of every matched route and React
   * hoists a `<title>` a component renders on top of that, so a root title plus
   * a failure document's own title produces TWO `<title>` elements —
   * `api/title-contract.hurl` asserts `count(//title) == 1`. Every route that
   * renders a document owns its title outright.
   */
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'UMAXICA Service Application' },
    ],
    links: [
      { rel: 'stylesheet', href: styleUrl },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  notFoundComponent: NotFoundDocument,
  errorComponent: ErrorDocument,
  shellComponent: RootDocument,
});

/*
 * The bare document, with no application chrome.
 *
 * The split is deliberate: this root supplies `<html>` and `<body>` only, and
 * the header, navigation and footer live on the pathless `src/routes/_page.tsx`
 * layout route so that the status surfaces outside it stay chrome-free. The
 * not-found and error documents sit outside it — so, unlike the satellite frames, this
 * frame's failure documents keep exactly the shape they had.
 */
function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body className="bg-canvas leading-body text-gray-900">
        <ServiceWorkerRegistration />
        {children}
        {/*
         * Last in the body and outside every landmark, because it is not
         * content: it is the announcement channel for a client-side
         * navigation. It has to be mounted here, in the shell, rather than on
         * the layout that carries the chrome — the status surfaces and the
         * failure documents are reached by navigation too, and a reader who
         * lands on one of them is exactly the reader who most needs to be told.
         */}
        <RouteAnnouncer />
        <Scripts />
      </body>
    </html>
  );
}
