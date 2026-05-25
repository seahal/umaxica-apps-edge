import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { NextRequest } from 'next/server';

type RailsServiceBinding = {
  fetch(request: Request): Promise<Response>;
};

type RailsEnv = {
  RAILS_API?: RailsServiceBinding;
  POST_RAILS_API_BASE_URL?: string;
};

const passthroughHeaders = new Set(['accept', 'authorization', 'content-type']);

function buildRailsRequest(request: NextRequest, targetUrl: URL) {
  const headers = new Headers();

  for (const [name, value] of request.headers) {
    if (passthroughHeaders.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  }

  return new Request(targetUrl, {
    body: request.body,
    duplex: 'half',
    headers,
    method: request.method,
    redirect: 'manual',
  } as RequestInit);
}

async function proxyRails(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const railsPath = `/${path.map(encodeURIComponent).join('/')}`;
  const { env } = getCloudflareContext();
  const railsEnv = env as RailsEnv;
  const configuredBaseUrl = railsEnv.POST_RAILS_API_BASE_URL?.trim();

  if (!configuredBaseUrl && !railsEnv.RAILS_API) {
    return Response.json(
      {
        error: 'Rails backend is not configured',
        expected:
          'Set POST_RAILS_API_BASE_URL for local development or bind RAILS_API via Workers VPC.',
      },
      { status: 501 },
    );
  }

  const targetUrl = new URL(configuredBaseUrl || 'https://rails-api.invalid');
  targetUrl.pathname = `${targetUrl.pathname.replace(/\/$/, '')}${railsPath}`;
  targetUrl.search = request.nextUrl.search;

  const railsRequest = buildRailsRequest(request, targetUrl);

  if (railsEnv.RAILS_API) {
    return railsEnv.RAILS_API.fetch(railsRequest);
  }

  return fetch(railsRequest);
}

export const DELETE = proxyRails;
export const GET = proxyRails;
export const PATCH = proxyRails;
export const POST = proxyRails;
export const PUT = proxyRails;
