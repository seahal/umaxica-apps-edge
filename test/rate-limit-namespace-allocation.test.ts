/**
 * Repository invariants for adr/022 rate-limit namespace allocation.
 *
 * `tools/check-workers.mjs` is the deployment-config checker. This suite pins
 * the formula, the operations document, AUTH staying on X10N, and the known
 * Jump reservation so a copy-paste of 520900 into Edge fails here too.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AUTH_BRAND_DIGIT,
  AUTH_RATE_LIMITER_BUDGET,
  GLOBAL_SURFACES,
  JUMP,
  RATE_LIMITER_BUDGET,
  REGION,
  RESERVED_USA_CORE_NAMESPACE_IDS,
  RETIRED_NAMESPACE_IDS,
  authRateLimiterNamespace,
  developmentPortFromDevScript,
  expectedDevelopmentPort,
  isPositiveIntegerString,
  parseWorkspace,
  rateLimiterNamespace,
  regionForSurface,
  regionSuffixOf,
} from '../tools/lib/rate-limit-namespaces.mjs';
import { loadManifest, parseJsonc, repoRoot } from '../tools/lib/wrangler-config.mjs';

const opsDoc = 'docs/operations/rate-limit-namespace-allocation.md';

const PRODUCTION_RATE_LIMITERS = {
  'com/apex': '510100',
  'com/info': '510300',
  'com/core': '510581',
  'com/docs': '510600',
  'com/news': '510700',
  'com/help': '510800',
  'net/apex': '520100',
  'org/apex': '530100',
  'org/info': '530300',
  'org/core': '530581',
  'org/docs': '530600',
  'org/news': '530700',
  'org/help': '530800',
  'app/apex': '540100',
  'app/info': '540300',
  'app/core': '540581',
  'app/docs': '540600',
  'app/news': '540700',
  'app/help': '540800',
  'dev/apex': '550100',
} as const;

type WranglerConfig = {
  ratelimits?: Array<{
    name?: string;
    namespace_id?: string;
    simple?: { limit?: number; period?: number };
  }>;
  env?: Record<
    string,
    {
      ratelimits?: Array<{
        name?: string;
        namespace_id?: string;
        simple?: { limit?: number; period?: number };
      }>;
    }
  >;
};

function deploymentUnits(): string[] {
  const manifest = loadManifest() as {
    railsBacked: string[];
    railsBackedVite?: string[];
    railsBackedVpcVite?: string[];
    contentSurface: string[];
    standalone: string[];
  };
  return [
    ...manifest.railsBacked,
    ...(manifest.railsBackedVite ?? []),
    ...(manifest.railsBackedVpcVite ?? []),
    ...manifest.contentSurface,
    ...manifest.standalone,
  ];
}

function readUnitWrangler(ws: string): WranglerConfig {
  return parseJsonc(readFileSync(join(repoRoot, ws, 'wrangler.jsonc'), 'utf8')) as WranglerConfig;
}

function allLimits(ws: string, config: WranglerConfig) {
  const rows: { env: string; limit: NonNullable<WranglerConfig['ratelimits']>[number] }[] = [];
  for (const limit of config.ratelimits ?? []) rows.push({ env: 'production', limit });
  for (const [env, block] of Object.entries(config.env ?? {})) {
    for (const limit of block.ratelimits ?? []) rows.push({ env, limit });
  }
  return rows.map((row) => ({ ws, ...row }));
}

describe('rate-limit namespace allocation', () => {
  const units = deploymentUnits();

  it('keeps a normative operations document next to the ADR', () => {
    expect(existsSync(join(repoRoot, opsDoc))).toBe(true);
    const text = readFileSync(join(repoRoot, opsDoc), 'utf8');
    expect(text).toContain('520900');
    expect(text).toContain('AUTH_RATE_LIMITER');
    expect(text).toContain('01');
    expect(text).toContain(JUMP.productionNamespaceId);
  });

  it('derives production RATE_LIMITER ids from each unit port and region', () => {
    for (const [ws, id] of Object.entries(PRODUCTION_RATE_LIMITERS)) {
      const { brand, surface } = parseWorkspace(ws);
      const port = expectedDevelopmentPort(brand, surface);
      const region = regionForSurface(surface);
      expect(port, ws).toBeTruthy();
      expect(region, ws).toBeTruthy();
      expect(rateLimiterNamespace({ env: 'production', port, region })).toBe(id);
    }
  });

  it('assigns Jump 520900 as the net/jump Global production namespace', () => {
    expect(JUMP.port).toBe('5209');
    expect(JUMP.region).toBe(REGION.GLOBAL);
    expect(JUMP.productionNamespaceId).toBe('520900');
    expect(rateLimiterNamespace({ env: 'production', port: JUMP.port, region: JUMP.region })).toBe(
      '520900',
    );
    expect(GLOBAL_SURFACES.has('jump')).toBe(true);
  });

  it('keeps AUTH_RATE_LIMITER on the historical X10N series', () => {
    expect(authRateLimiterNamespace({ env: 'production', brand: 'app' })).toBe('1101');
    expect(authRateLimiterNamespace({ env: 'development', brand: 'com' })).toBe('2102');
    expect(authRateLimiterNamespace({ env: 'test', brand: 'org' })).toBe('3103');
    expect(authRateLimiterNamespace({ env: 'local', brand: 'app' })).toBe('5101');
    expect(AUTH_BRAND_DIGIT).toEqual({ app: '1', com: '2', org: '3' });
  });

  it('gives every active RATE_LIMITER a unique account-wide namespace', () => {
    const byNamespace = new Map<string, string>();
    byNamespace.set(JUMP.productionNamespaceId, `${JUMP.repo} ${JUMP.binding}`);
    for (const id of RETIRED_NAMESPACE_IDS) {
      byNamespace.set(id, `retired ${id}`);
    }
    for (const id of RESERVED_USA_CORE_NAMESPACE_IDS) {
      byNamespace.set(id, `reserved USA core ${id}`);
    }

    for (const ws of units) {
      const config = readUnitWrangler(ws);
      const { brand, surface } = parseWorkspace(ws);
      const pkg = JSON.parse(readFileSync(join(repoRoot, ws, 'package.json'), 'utf8')) as {
        scripts?: { dev?: string };
      };
      const port = developmentPortFromDevScript(pkg.scripts?.dev);
      expect(port, `${ws} scripts.dev --port`).toBe(expectedDevelopmentPort(brand, surface));
      const region = regionForSurface(surface);
      expect(region, ws).toBeTruthy();

      for (const { env, limit } of allLimits(ws, config)) {
        const id = limit.namespace_id ?? '';
        expect(isPositiveIntegerString(id), `${ws} ${env} ${limit.name}`).toBe(true);

        if (limit.name === 'RATE_LIMITER') {
          expect(limit.simple).toEqual(RATE_LIMITER_BUDGET);
          expect(id).toBe(rateLimiterNamespace({ env, port, region }));
          if (surface === 'core') {
            expect(regionSuffixOf(id)).toBe(REGION.JAPAN);
            expect(regionSuffixOf(id)).not.toBe(REGION.GLOBAL);
          } else {
            expect(regionSuffixOf(id)).toBe(REGION.GLOBAL);
          }
          expect(regionSuffixOf(id)).not.toBe(REGION.USA);
          if (env === 'production') {
            expect(id).toBe(PRODUCTION_RATE_LIMITERS[ws as keyof typeof PRODUCTION_RATE_LIMITERS]);
          }
        } else if (limit.name === 'AUTH_RATE_LIMITER') {
          expect(surface).toBe('core');
          expect(limit.simple).toEqual(AUTH_RATE_LIMITER_BUDGET);
          expect(id).toBe(authRateLimiterNamespace({ env, brand }));
        } else {
          throw new Error(`${ws} ${env} unknown limiter ${limit.name}`);
        }

        const seen = byNamespace.get(id);
        expect(seen, `${ws} ${env} ${limit.name} ${id} collides with ${seen}`).toBeUndefined();
        byNamespace.set(id, `${ws} ${env} ${limit.name}`);
      }
    }

    expect(byNamespace.has(JUMP.productionNamespaceId)).toBe(true);
    for (const id of RESERVED_USA_CORE_NAMESPACE_IDS) {
      expect(byNamespace.get(id)?.startsWith('reserved')).toBe(true);
    }
  });
});
