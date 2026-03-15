import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

export interface LoaderData {
  apexServiceUrl: string;
  apiServiceUrl: string;
  codeName: string;
  cspNonce: string;
  docsServiceUrl: string;
  edgeServiceUrl: string;
  helpServiceUrl: string;
  locale: string;
  newsServiceUrl: string;
}

import { ErrorPage, ServiceUnavailablePage } from './components/ErrorPage';
import { CloudflareContext, getEnv, getNonce } from './context';
import { getLocale, i18nextMiddleware, localeCookie } from './middleware/i18next';
import { InternalServerErrorPage } from './routes/InternalServerErrorPage';
import { NotFoundPage } from './routes/NotFoundPage';

// Local definition of MiddlewareFunction since the export from react-router might not be picked up correctly by all tools
type MiddlewareFunction = (
  args: {
    context: RouterContextProvider;
    request: Request;
  },
  next: () => Promise<Response> | Response,
) => Promise<Response> | Response;

// 既定のメタ情報（各ページで未指定の場合のデフォルト）
export function meta(_: Route.MetaArgs) {
  return [{ title: '' }];
}

export function Layout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const loaderData = useLoaderData<LoaderData>();
  const nonce = loaderData.cspNonce || undefined;

  return (
    <html lang={i18n.language} dir={i18n.dir(i18n.language)}>
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

export default function App({ loaderData }: { loaderData: LoaderData }) {
  const { i18n } = useTranslation();
  const { locale } = loaderData;

  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

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

export const middleware: MiddlewareFunction[] = [securityContextMiddleware, i18nextMiddleware];

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

export async function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context) as unknown as Record<string, string | undefined>;
  const cspNonce = getNonce(context);
  const locale = getLocale(context as unknown as Readonly<RouterContextProvider>);

  return Response.json(
    {
      apexServiceUrl: env.APEX_SERVICE_URL ?? '',
      apiServiceUrl: env.API_SERVICE_URL ?? '',
      codeName: env.BRAND_NAME ?? '',
      cspNonce,
      docsServiceUrl: env.DOCS_SERVICE_URL ?? '',
      edgeServiceUrl: env.EDGE_SERVICE_URL ?? '',
      helpServiceUrl: env.HELP_SERVICE_URL ?? '',
      locale,
      newsServiceUrl: env.NEWS_SERVICE_URL ?? '',
    },
    {
      headers: {
        'Set-Cookie': await localeCookie.serialize(locale),
      },
    },
  );
}
