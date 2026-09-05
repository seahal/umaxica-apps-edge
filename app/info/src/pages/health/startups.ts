import type { APIRoute } from 'astro';

import { renderProbe } from '../../lib/runtime-health';

export const prerender = false;

export const GET: APIRoute = () => renderProbe('startup');
