import { RouterContextProvider, createRequestHandler } from 'react-router';
import { checkRateLimit } from '../../../shared/apex/rate-limit';
import { withResolvedSecretValue } from '../../../shared/cloudflare/secrets-store';
import { CloudflareContext } from '../src/context';

const ORG_CORE_SENTRY_DSN_KEY = 'UMAXICA_APPS_EDGE_ORG_CORE_SENTRY_DSN';
const serverMode = (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE;

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCodePoint(...array));
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  serverMode,
  () => new RouterContextProvider(),
);

export default {
  async fetch(request, env, ctx) {
    const runtimeEnv = await withResolvedSecretValue(
      env as unknown as Record<string, unknown>,
      ORG_CORE_SENTRY_DSN_KEY,
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
