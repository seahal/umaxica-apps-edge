import { env } from 'cloudflare:workers';

/*
 * The Cloudflare bindings this Astro build reads, and the one place their shape
 * is named. Ported from `src/lib/cloudflare-env.ts`.
 *
 * Astro 7 removed `Astro.locals.runtime.env`; the runtime's own
 * `cloudflare:workers` module is the way to read a binding — the same module the
 * TanStack unit used. It is not an async-local lookup, so it cannot throw for
 * being called outside a request.
 *
 * On-demand routes (`/health`, `/revision`, `/api/v0/revision.json`) import this file; every
 * prerendered page is built with no bindings at all. Every field is optional:
 * `getRailsClient()` selects its transport by which binding EXISTS.
 */
export interface EdgeBindings {
  UMAXICA_APPS_EDGE_CF_WORKERS_VPC?: {
    fetch(input: string, init?: RequestInit): Promise<Response>;
  };
  REVISION?: { id?: string; tag?: string; timestamp?: string };
  RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

export function getEdgeBindings(): EdgeBindings {
  return env;
}
