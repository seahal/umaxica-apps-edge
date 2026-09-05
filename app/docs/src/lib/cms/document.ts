import { z } from 'astro/zod';

export const CMS_RESPONSE_MAX_BYTES = 1024 * 1024;
const schema = z
  .object({
    namespace: z.literal('docs'),
    surface: z.literal('app'),
    slug: z.string().min(1),
    locale: z.enum(['ja', 'en']),
    title: z.string().min(1),
    summary: z.string().nullable(),
    body: z.object({ text: z.string() }).strict(),
    published_at: z.iso.datetime({ offset: true }),
    taxonomy: z.record(z.string(), z.unknown()),
  })
  .loose();
export type CmsDocument = z.infer<typeof schema>;
export type CmsLocale = CmsDocument['locale'];
export type InvalidContractReason =
  | 'body_missing_or_invalid'
  | 'invalid_json'
  | 'response_too_large'
  | 'schema_mismatch';
export type TransportReason =
  | 'connection_limit_reached'
  | 'connection_refused'
  | 'connection_terminated'
  | 'connection_timeout'
  | 'destination_not_found'
  | 'destination_unavailable'
  | 'dns_error'
  | 'http_response_incomplete'
  | 'rate_limited'
  | 'tls_certificate_error'
  | 'unknown';
export type CmsFetchResult =
  | { kind: 'ok'; document: CmsDocument; upstreamStatus: number }
  | { kind: 'not-found'; upstreamStatus: 404 }
  | { kind: 'invalid-contract'; reason: InvalidContractReason; upstreamStatus: number }
  | { kind: 'upstream-error'; upstreamStatus: number }
  | { kind: 'upstream-access-error'; upstreamStatus: 401 | 403 }
  | { kind: 'upstream-rate-limited'; upstreamStatus: 429 }
  | { kind: 'upstream-protocol-error'; upstreamStatus: number }
  | { kind: 'upstream-unavailable'; transportReason: TransportReason }
  | { kind: 'timeout' }
  | {
      kind: 'configuration-error';
      reason:
        | 'binding_invalid'
        | 'binding_missing'
        | 'deployment_environment_mismatch'
        | 'required_runtime_value_missing';
    }
  | { kind: 'internal-error' };
export function parseCmsDocument(
  value: unknown,
): { kind: 'ok'; document: CmsDocument } | { kind: 'invalid'; reason: InvalidContractReason } {
  if (typeof value !== 'object' || value === null || !('body' in value))
    return { kind: 'invalid', reason: 'body_missing_or_invalid' };
  const body = Reflect.get(value, 'body');
  if (
    typeof body !== 'object' ||
    body === null ||
    Object.keys(body).length !== 1 ||
    typeof Reflect.get(body, 'text') !== 'string'
  )
    return { kind: 'invalid', reason: 'body_missing_or_invalid' };
  const parsed = schema.safeParse(value);
  return parsed.success
    ? { kind: 'ok', document: parsed.data }
    : { kind: 'invalid', reason: 'schema_mismatch' };
}
export function cmsStatus(result: CmsFetchResult): number {
  switch (result.kind) {
    case 'ok':
      return 200;
    case 'not-found':
      return 404;
    case 'configuration-error':
    case 'internal-error':
      return 500;
    case 'invalid-contract':
    case 'upstream-access-error':
    case 'upstream-error':
    case 'upstream-protocol-error':
      return 502;
    case 'upstream-rate-limited':
    case 'upstream-unavailable':
      return 503;
    case 'timeout':
      return 504;
  }
}
