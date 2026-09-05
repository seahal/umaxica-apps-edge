import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { env } from 'cloudflare:workers';

import { createRailsClient } from '../lib/rails-client';

export const prerender = false;

const MAX_BYTES = 1024 * 1024;
const schema = z.looseObject({
  data: z.array(z.looseObject({ slug: z.string().min(1) })),
  page: z.unknown(),
});

const reply = (status: number, body: object) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });

/**
 * `env` is typed by `cloudflare:workers` as whatever the ambient
 * `CloudflareEnv` declares, which is broader than what this route actually
 * needs. Reading `UMAXICA_APPS_EDGE_CF_WORKERS_VPC` through `Reflect.get` and
 * narrowing it with a type predicate — rather than an `as` cast on the
 * `Reflect.get` result — is what lets the compiler confirm the `fetch` shape
 * this route hands to `createRailsClient` instead of just asserting it.
 */
function hasFetchBinding(value: unknown): value is { fetch: typeof fetch } {
  return (
    typeof value === 'object' && value !== null && typeof Reflect.get(value, 'fetch') === 'function'
  );
}

export const GET: APIRoute = async () => {
  if (Reflect.get(env, 'EDGE_ENV') !== 'cms_bootstrap') return reply(404, { status: 'not_found' });
  const binding: unknown = Reflect.get(env, 'UMAXICA_APPS_EDGE_CF_WORKERS_VPC');
  if (!hasFetchBinding(binding)) return reply(500, { status: 'configuration_error' });

  const result = await createRailsClient(binding, 'http://docs.app.localhost:3000').fetch(
    '/api/v0/entries?locale=ja&limit=1',
    { headers: { Accept: 'application/json' } },
  );
  if (result.kind !== 'ok') return reply(502, { status: 'upstream_error' });
  const length = Number(result.response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BYTES)
    return reply(502, { status: 'invalid_contract' });
  const bytes = new Uint8Array(await result.response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return reply(502, { status: 'invalid_contract' });
  try {
    const parsed = schema.safeParse(JSON.parse(new TextDecoder().decode(bytes)) as unknown);
    if (!parsed.success) return reply(502, { status: 'invalid_contract' });
    return reply(200, {
      status: 'ok',
      count: parsed.data.data.length,
      first_slug: parsed.data.data[0]?.slug ?? null,
    });
  } catch {
    return reply(502, { status: 'invalid_contract' });
  }
};
