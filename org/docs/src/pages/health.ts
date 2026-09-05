import type { APIRoute } from 'astro';

import { getEdgeBindings } from '../lib/env';
import { getRailsClient } from '../lib/rails-client';
import { checkRailsHealth, edgeReadinessFromRails } from '../lib/rails-health';
import { renderAggregateHealth, runtimeProbes } from '../lib/runtime-health';

/*
 * Human-readable aggregate of the three Kubernetes probes. On-demand so a
 * static `ok` file is never treated as a live Worker. Rails availability is
 * read at request time over Workers VPC and mapped onto Edge's text/plain
 * contract — the Rails Health API body is never forwarded.
 */
export const prerender = false;

export const GET: APIRoute = async () => {
  const isolate = runtimeProbes.checkReadiness();
  const readiness =
    isolate === 'ok'
      ? edgeReadinessFromRails(await checkRailsHealth(getRailsClient(getEdgeBindings())))
      : isolate;
  return renderAggregateHealth(readiness);
};
