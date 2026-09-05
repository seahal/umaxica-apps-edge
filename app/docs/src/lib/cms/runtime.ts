import type { EdgeBindings } from '../env';
import { getRailsClient } from '../rails-client';
import { createCmsClient, type CmsClient } from './client';
import type { CmsFetchResult } from './document';
export function resolveCmsClient(bindings: EdgeBindings): CmsClient | CmsFetchResult {
  const candidate: unknown = Reflect.get(bindings, 'UMAXICA_APPS_EDGE_CF_WORKERS_VPC');
  if (candidate === undefined) return { kind: 'configuration-error', reason: 'binding_missing' };
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    typeof Reflect.get(candidate, 'fetch') !== 'function'
  )
    return { kind: 'configuration-error', reason: 'binding_invalid' };
  try {
    const rails = getRailsClient(bindings);
    return rails
      ? createCmsClient(rails)
      : { kind: 'configuration-error', reason: 'binding_missing' };
  } catch {
    return { kind: 'internal-error' };
  }
}
