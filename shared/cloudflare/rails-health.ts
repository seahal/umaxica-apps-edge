import type { RailsClient } from './rails-client';

const RAILS_HEALTH_PATH = '/health/liveness.json';

export type RailsHealthResult =
  | { kind: 'ok'; status: number }
  | { kind: 'http-error'; status: number }
  | { kind: 'unreachable'; errorMessage: string }
  | { kind: 'not-configured' };

export async function checkRailsHealth(client: RailsClient | null): Promise<RailsHealthResult> {
  if (!client) {
    return { kind: 'not-configured' };
  }

  const result = await client.fetch(RAILS_HEALTH_PATH);

  switch (result.kind) {
    case 'ok':
      return { kind: 'ok', status: result.status };
    case 'http-error':
      return { kind: 'http-error', status: result.status };
    case 'unreachable':
      return { kind: 'unreachable', errorMessage: result.errorMessage };
    case 'invalid-path':
      return { kind: 'unreachable', errorMessage: result.reason };
  }
}
