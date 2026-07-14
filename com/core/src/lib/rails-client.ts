import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  createRailsClient,
  type RailsClient,
  type RailsFetcher,
} from '../../../../shared/cloudflare/rails-client';

const RAILS_HOSTNAME = 'core.com.localhost';
const RAILS_PORT = 3000;

function createDevOnlyFetcher(): RailsFetcher {
  return {
    fetch(input, init) {
      return fetch(input, init);
    },
  };
}

export function getRailsClient(): RailsClient | null {
  const { env } = getCloudflareContext() as { env: Partial<CloudflareEnv> };
  const binding = env.UMAXICA_APPS_EDGE_CF_WORKERS_VPC;

  if (binding) {
    return createRailsClient(binding, RAILS_HOSTNAME, RAILS_PORT);
  }

  if (process.env.NODE_ENV === 'development') {
    return createRailsClient(createDevOnlyFetcher(), RAILS_HOSTNAME, RAILS_PORT);
  }

  return null;
}
