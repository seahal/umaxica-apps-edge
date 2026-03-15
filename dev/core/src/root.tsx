import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
} from 'react-router';

import './app.css';
import type { ReactNode } from 'react';
import type { Route } from './+types/root';
import { getNonce, readEnv } from './context';

interface RouteErrorBoundaryProps {
  error: unknown;
}

function isDevEnvironment(): boolean {
  const importMeta = import.meta as ImportMeta & { env?: Record<string, unknown> };
  return importMeta.env?.['DEV'] === true;
}

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: ReactNode }) {
  const { cspNonce } = useLoaderData<Awaited<ReturnType<typeof loader>>>();
  const nonce = cspNonce || undefined;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

const FALLBACK_SETTINGS = {
  codeName: 'Umaxica Developers',
  docsServiceUrl: '',
  helpServiceUrl: '',
  newsServiceUrl: '',
} as const;

export function loader({ context }: Route.LoaderArgs) {
  const cspNonce = getNonce(context);

  const codeName = readEnv(context, 'BRAND_NAME', FALLBACK_SETTINGS.codeName);
  const helpServiceUrl = readEnv(context, 'HELP_SERVICE_URL', FALLBACK_SETTINGS.helpServiceUrl);
  const docsServiceUrl = readEnv(context, 'DOCS_SERVICE_URL', FALLBACK_SETTINGS.docsServiceUrl);
  const newsServiceUrl = readEnv(context, 'NEWS_SERVICE_URL', FALLBACK_SETTINGS.newsServiceUrl);

  return {
    codeName,
    cspNonce,
    docsServiceUrl,
    helpServiceUrl,
    newsServiceUrl,
  };
}

export function ErrorBoundary({ error }: RouteErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
  } else if (isDevEnvironment() && error && error instanceof Error) {
    details = error.message;
    ({ stack } = error);
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
