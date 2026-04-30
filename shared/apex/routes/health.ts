import { Hono } from 'hono';
import { buildHealthPageHtml, getBrandName } from '../html';
import { createBadRequestFallback } from '../html/fallback-pages';
import type { Context, ErrorHandler } from 'hono';

const HEALTH_ROBOTS_HEADER = 'noindex, nofollow';

export interface HealthBindings {
  Bindings: {
    BRAND_NAME?: string;
    REVISION?: {
      id: string;
      tag: string;
      timestamp: string;
    };
  };
}

export type HealthContext = Context<HealthBindings>;

function renderHealthResponse(
  brandName: string,
  revision?: HealthBindings['Bindings']['REVISION'],
): Response {
  const timestampIso = new Date().toISOString();
  const html = buildHealthPageHtml(brandName, timestampIso, revision);

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

  route.get('/health', (c: HealthContext) => {
    const brandName = getBrandName(c.env);
    return renderHealthResponse(brandName, c.env?.REVISION);
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
