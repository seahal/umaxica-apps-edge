import type { APIRoute } from 'astro';

import { renderHealthApi } from '../../../lib/runtime-health';

/*
 * Machine-facing Edge self-health API. On-demand so a static JSON file is
 * never treated as a live Worker. This handler does not import Rails, CMS,
 * or any other hop.
 */
export const prerender = false;

export const GET: APIRoute = () => renderHealthApi();
