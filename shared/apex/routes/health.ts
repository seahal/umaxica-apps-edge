import { Hono } from 'hono';
import { timeout } from 'hono/timeout';
import { buildHealthPageHtml, getBrandName } from '../html';
import type { RailsHealthResult } from '../html/health-page';
import { createBadRequestFallback } from '../html/fallback-pages';
import type { Context, ErrorHandler } from 'hono';

const HEALTH_ROBOTS_HEADER = 'noindex, nofollow';

export interface HealthBindings {
  Bindings: {
    BRAND_NAME?: string;
    RAILS_API_URL?: string;
    REVISION?: {
      id: string;
      tag: string;
      timestamp: string;
    };
  };
}

export type HealthContext = Context<HealthBindings>;

async function fetchRailsHealth(apiUrl: string): Promise<RailsHealthResult> {
  try {
    const res = await fetch(`${apiUrl}/edge/v0/health`, {
      signal: AbortSignal.timeout(1500),
    });
    const body = await res.text();
    if (res.ok) {
      return { ok: true, status: res.status, body };
    }
    return { ok: false, status: res.status, body };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function renderHealthResponse(
  brandName: string,
  railsResult: RailsHealthResult | null,
  revision?: HealthBindings['Bindings']['REVISION'],
): Response {
  const timestampIso = new Date().toISOString();
  const html = buildHealthPageHtml(brandName, timestampIso, railsResult, revision);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'X-Robots-Tag': HEALTH_ROBOTS_HEADER,
    },
  });
}

export function createHealthRoute(): Hono<HealthBindings> {
  const route = new Hono<HealthBindings>();

  route.get('/health', timeout(2000), async (c: HealthContext) => {
    const brandName = getBrandName(c.env);
    const railsApiUrl = c.env?.RAILS_API_URL;
    const railsResult = railsApiUrl ? await fetchRailsHealth(railsApiUrl) : null;
    return renderHealthResponse(brandName, railsResult, c.env?.REVISION);
  });

  // Propagate errors to parent app so onError handlers work correctly
  const errorHandler: ErrorHandler<HealthBindings> = (err) => {
    throw err;
  };
  route.onError(errorHandler);

  return route;
}

export async function handleHealthError(c: HealthContext): Promise<Response> {
  return createBadRequestFallback(c);
}
