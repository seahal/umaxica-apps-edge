import { RouterContextProvider, createRequestHandler } from 'react-router';
import { checkRateLimit } from '../../../shared/apex/rate-limit';
import { withResolvedSecretValue } from '../../../shared/cloudflare/secrets-store';
import { CloudflareContext } from '../src/context';

const COM_CORE_SENTRY_DSN_KEY = 'UMAXICA_APPS_EDGE_COM_CORE_SENTRY_DSN';

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCodePoint(...array));
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
  () => new RouterContextProvider(),
);

export default {
  async fetch(request, env, ctx) {
    const runtimeEnv = await withResolvedSecretValue(
      env as unknown as Record<string, unknown>,
      COM_CORE_SENTRY_DSN_KEY,
    );
    const rateLimitResponse = await checkRateLimit(request, env.RATE_LIMITER);
    if (rateLimitResponse) return rateLimitResponse;

    const nonce = generateNonce();

    const contextProvider = new RouterContextProvider();
    contextProvider.set(CloudflareContext, {
      cloudflare: { ctx, env: runtimeEnv as unknown as Env },
      security: { nonce },
    });

    return requestHandler(request, contextProvider);
  },
} satisfies ExportedHandler<Env>;
