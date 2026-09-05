import { describe, expect, it, vi } from 'vitest';

import { resolveCmsClient } from '../../src/lib/cms/runtime';
import * as railsClient from '../../src/lib/rails-client';
describe('CMS runtime invariants', () => {
  it('classifies a missing binding as configuration failure', () =>
    expect(resolveCmsClient({})).toEqual({
      kind: 'configuration-error',
      reason: 'binding_missing',
    }));
  it('classifies an invalid binding capability', () =>
    expect(resolveCmsClient({ UMAXICA_APPS_EDGE_CF_WORKERS_VPC: {} as never })).toEqual({
      kind: 'configuration-error',
      reason: 'binding_invalid',
    }));
  it('constructs a client only from a fetch binding', () =>
    expect(
      resolveCmsClient({
        UMAXICA_APPS_EDGE_CF_WORKERS_VPC: { fetch: () => Promise.resolve(new Response()) },
      }),
    ).toHaveProperty('fetchDocument'));

  it('classifies a throwing Rails client factory as an internal error', () => {
    vi.spyOn(railsClient, 'getRailsClient').mockImplementation(() => {
      throw new Error('workers env unavailable');
    });
    expect(
      resolveCmsClient({
        UMAXICA_APPS_EDGE_CF_WORKERS_VPC: { fetch: () => Promise.resolve(new Response()) },
      }),
    ).toEqual({ kind: 'internal-error' });
    vi.restoreAllMocks();
  });

  it('classifies a present binding that still yields no client as missing', () => {
    vi.spyOn(railsClient, 'getRailsClient').mockReturnValue(null);
    expect(
      resolveCmsClient({
        UMAXICA_APPS_EDGE_CF_WORKERS_VPC: { fetch: () => Promise.resolve(new Response()) },
      }),
    ).toEqual({ kind: 'configuration-error', reason: 'binding_missing' });
    vi.restoreAllMocks();
  });
});
