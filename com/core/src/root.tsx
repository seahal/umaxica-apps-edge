import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
} from 'react-router';
import type { RouterContextProvider } from './context';

import type { Route } from './+types/root';
import './app.css';

import type { ReactNode } from 'react';
import { ErrorPage, ServiceUnavailablePage } from './components/ErrorPage';
import { InternalServerErrorPage } from './components/InternalServerErrorPage';
import { NotFoundPage } from './components/NotFoundPage';
import { CloudflareContext, getEnv, getNonce } from './context';

// Local definition of MiddlewareFunction since it might not be exported from react-router
type MiddlewareFunction = (
  args: {
    context: RouterContextProvider;
    request: Request;
  },
  next: () => Promise<Response> | Response,
) => Promise<Response> | Response;

export function meta() {
  return [{ title: 'Umaxica' }];
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
        <ScrollRestoration {...(nonce ? { nonce } : {})} />
        <Scripts {...(nonce ? { nonce } : {})} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCodePoint(...bytes));
}

const securityContextMiddleware: MiddlewareFunction = ({ context }, next) => {
  const currentContext = context.get(CloudflareContext) ?? {};
  const currentNonce = currentContext.security?.nonce;

  if (!currentNonce) {
    context.set(CloudflareContext, {
      ...currentContext,
      security: {
        ...currentContext.security,
        nonce: generateNonce(),
      },
    });
  }

  return next();
};

export const middleware: MiddlewareFunction[] = [securityContextMiddleware];

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps): React.JSX.Element {
  if (isRouteErrorResponse(error)) {
    const rr = error as { status: number; statusText?: string };

    if (rr.status === 404) {
      return <NotFoundPage />;
    }

    if (rr.status === 503) {
      return <ServiceUnavailablePage />;
    }

    if (rr.status >= 500) {
      return (
        <InternalServerErrorPage
          details={rr.statusText || `HTTP ${rr.status} エラーが発生しました`}
        />
      );
    }

    return (
      <ErrorPage
        status={rr.status}
        title={`${rr.status} エラー`}
        message={rr.statusText || 'リクエストの処理中にエラーが発生しました。'}
        suggestion="時間をおいて再度お試しいただくか、お問い合わせフォームからご連絡ください。"
        showNavigation
      />
    );
  }

  if (error instanceof Error) {
    return <InternalServerErrorPage details={error.message} />;
  }

  return (
    <ErrorPage
      status={500}
      title="予期しないエラー"
      message="申し訳ございません。予期しないエラーが発生しました。"
      suggestion="ページを再読み込みするか、お問い合わせフォームからご連絡ください。"
      showNavigation
    />
  );
}

export function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context) as unknown as Record<string, string | undefined>;
  const cspNonce = getNonce(context);

  return {
    codeName: env.BRAND_NAME ?? '',
    cspNonce,
    docsServiceUrl: env.DOCS_CORPORATE_URL ?? '',
    helpServiceUrl: env.HELP_CORPORATE_URL ?? '',
    newsServiceUrl: env.NEWS_CORPORATE_URL ?? '',
  };
}
