import { isbot } from 'isbot';
// oxlint-disable no-console
import { renderToReadableStream } from 'react-dom/server';
import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import { getNonce } from './context';

export function handleError(error: unknown, { request }: { request: Request }) {
  if (!request.signal.aborted) {
    console.error(error);
  }
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext,
) {
  let shellRendered = false;
  const userAgent = request.headers.get('user-agent');

  const nonce = getNonce(loadContext);

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      onError(error: unknown) {
        responseStatusCode = 500;
        // Log streaming rendering errors from inside the shell.  Don't log
        // Errors encountered during initial shell rendering since they'll
        // Reject and get logged in handleDocumentRequest.
        if (shellRendered) {
          console.error(error);
        }
      },
      ...(nonce ? { nonce } : {}),
    },
  );
  shellRendered = true;

  // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
  // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  responseHeaders.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  );
  responseHeaders.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
