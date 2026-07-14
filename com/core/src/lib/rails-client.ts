import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  createRailsClient,
  type RailsClient,
  type RailsFetcher,
} from '../../../../shared/cloudflare/rails-client';

const RAILS_HOSTNAME = 'core.com.localhost';
const RAILS_DEV_PORT = 3000;

function createDevOnlyFetcher(): RailsFetcher {
  return {
    fetch(input, init) {
      const url = new URL(input);
      url.protocol = 'http:';
      url.port = String(RAILS_DEV_PORT);
      return fetch(url.toString(), init);
    },
  };
}

export function getRailsClient(): RailsClient | null {
  const { env } = getCloudflareContext() as { env: Partial<CloudflareEnv> };
  const binding = env.UMAXICA_APPS_EDGE_CF_WORKERS_VPC;

  if (binding) {
    return createRailsClient(binding, RAILS_HOSTNAME);
  }

  if (process.env.NODE_ENV === 'development') {
    return createRailsClient(createDevOnlyFetcher(), RAILS_HOSTNAME);
  }

  return null;
}
