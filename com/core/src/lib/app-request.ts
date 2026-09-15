import { paraglideMiddleware } from '../paraglide/server';
import { withSecurityHeaders } from '../security-headers';
import { createNonce, runWithNonce } from '../security-nonce';
import '../i18n/paraglide-server';

/*
 * The application half of a Core request, minus the TanStack handler that only
 * the Worker build can construct.
 *
 * `src/lib/app-handler.ts` is wiring: it builds that handler and installs the
 * ALS nonce store. This module is the behaviour — one nonce minted per
 * production request, published for the render, and named in the CSP of
 * whatever comes back. Rate limiting and Rails dispatch live in `src/worker.ts`
 * and never reach here.
 *
 * Development mints nothing: a nonce would make the browser ignore
 * `'unsafe-inline'`, which Vite's own injected scripts rely on
 * (`security-nonce.ts`).
 */
export async function handleAppRequest(
  request: Request,
  // Widened to what TanStack's handler actually is — it may answer synchronously
  // — rather than narrowed at the call site with an assertion.
  render: (request: Request) => Response | Promise<Response>,
  isProduction: boolean,
): Promise<Response> {
  const nonce = isProduction ? createNonce() : undefined;
  const response = await paraglideMiddleware(request, () =>
    runWithNonce(nonce, () => render(request)),
  );

  return withSecurityHeaders(response, isProduction, nonce);
}
