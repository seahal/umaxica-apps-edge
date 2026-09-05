import type { APIRoute } from 'astro';

import { revisionTextResponse } from '../lib/version-metadata';

/*
 * Compact operational deployment revision: the Workers version id as text/plain.
 * Structured { id, tag, timestamp } is GET /api/v0/revision.json.
 *
 * On-demand because REVISION (Cloudflare version_metadata) only exists in the
 * Workers runtime. Missing metadata is the text sentinel `unknown`, never JSON.
 */
export const prerender = false;

export const GET: APIRoute = () => revisionTextResponse();
