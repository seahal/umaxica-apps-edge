import type { APIContext, APIRoute } from 'astro';

import { GET as healthApi } from '../../src/pages/api/v0/health.json';
import { GET as revisionJson } from '../../src/pages/api/v0/revision.json';
import { GET as health } from '../../src/pages/health';
import { GET as livenesses } from '../../src/pages/health/livenesses';
import { GET as readinesses } from '../../src/pages/health/readinesses';
import { GET as startups } from '../../src/pages/health/startups';
import { GET as manifest } from '../../src/pages/manifest.webmanifest';
import { GET as revision } from '../../src/pages/revision';
import { GET as robots } from '../../src/pages/robots.txt';
import { GET as sitemap } from '../../src/pages/sitemap.xml';

const context = {
  request: new Request('https://example.test/'),
  url: new URL('https://example.test/'),
} as APIContext;

function invoke(get: APIRoute): Promise<Response> | Response {
  return get(context);
}

export const handlers = {
  health: () => invoke(health),
  healthApi: () => invoke(healthApi),
  startups: () => invoke(startups),
  livenesses: () => invoke(livenesses),
  readinesses: () => invoke(readinesses),
  revision: () => invoke(revision),
  revisionApi: () => invoke(revisionJson),
  robots: () => invoke(robots),
  sitemap: () => invoke(sitemap),
  manifest: () => invoke(manifest),
};
