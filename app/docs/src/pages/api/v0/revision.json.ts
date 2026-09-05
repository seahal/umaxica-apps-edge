import type { APIRoute } from 'astro';

import { revisionJsonResponse } from '../../../lib/version-metadata';

/*
 * Structured Workers version metadata. On-demand so a static JSON file is
 * never treated as a live Worker. Not health.
 */
export const prerender = false;

export const GET: APIRoute = () => revisionJsonResponse();
