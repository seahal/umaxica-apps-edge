import { describe, it, expect } from 'vitest';
import { checkRailsHealth } from '../../src/lib/rails-health';
import type { RailsClient, RailsClientResult } from '../../src/lib/rails-client';

function makeClient(result: RailsClientResult): RailsClient {
  return {
    fetch: () => Promise.resolve(result),
  };
}

describe('rails health', () => {
  it('returns not-configured when no client is available', async () => {
    const result = await checkRailsHealth(null);
    expect(result).toEqual({ kind: 'not-configured' });
  });

  it('returns ok with a bounded status for a healthy response', async () => {
    const client = makeClient({ kind: 'ok', status: 200, response: new Response('ok') });
    const result = await checkRailsHealth(client);
    expect(result).toEqual({ kind: 'ok', status: 200 });
  });

  it('returns http-error with only the status class, no body', async () => {
    const client = makeClient({
      kind: 'http-error',
      status: 503,
      response: new Response('internal details', { status: 503 }),
    });
    const result = await checkRailsHealth(client);
    expect(result).toEqual({ kind: 'http-error', status: 503 });
    expect(JSON.stringify(result)).not.toContain('internal details');
  });

  it('returns unreachable with a bounded error message', async () => {
    const client = makeClient({ kind: 'unreachable', errorMessage: 'network down' });
    const result = await checkRailsHealth(client);
    expect(result).toEqual({ kind: 'unreachable', errorMessage: 'network down' });
  });

  it('maps an invalid-path client result to unreachable', async () => {
    const client = makeClient({ kind: 'invalid-path', reason: 'path must not be empty' });
    const result = await checkRailsHealth(client);
    expect(result).toEqual({ kind: 'unreachable', errorMessage: 'path must not be empty' });
  });
});
