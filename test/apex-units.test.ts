import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadManifest, parseJsonc, repoRoot } from '../tools/lib/wrangler-config.mjs';
import { loadTunnelSurfaces } from '../tools/verify-edge-connectivity.mjs';

/**
 * The five Hono apex deployment units. app/com/org were retired by
 * adr/024-retire-app-com-org-apex-units.md and reintroduced by
 * adr/027-reintroduce-app-com-org-apex-units.md. A unit is only half back if
 * one edge of the deployment graph still omits it, and an apex hostname with
 * two owners is worse than one with none, so each test pins one edge to
 * EXACTLY ONE entry per unit.
 */
const APEX = {
  'app/apex': { port: '5401', host: 'umaxica.app' },
  'com/apex': { port: '5101', host: 'umaxica.com' },
  'org/apex': { port: '5301', host: 'umaxica.org' },
  'net/apex': { port: '5201', host: 'umaxica.net' },
  'dev/apex': { port: '5501', host: 'umaxica.dev' },
} as const;
const REINTRODUCED = ['app/apex', 'com/apex', 'org/apex'] as const;

const read = (path: string) => readFileSync(join(repoRoot, path), 'utf8');
const count = (source: string, needle: string | RegExp) =>
  typeof needle === 'string'
    ? source.split(needle).length - 1
    : [...source.matchAll(new RegExp(needle, `${needle.flags.replace('g', '')}g`))].length;

describe('apex deployment units', () => {
  it('are each listed once in the pnpm workspace and lockfile importers', () => {
    const workspace = read('pnpm-workspace.yaml');
    const lock = read('pnpm-lock.yaml');
    for (const unit of Object.keys(APEX)) {
      expect(count(workspace, new RegExp(`^ {2}- ${unit}$`, 'mu')), unit).toBe(1);
      expect(count(lock, new RegExp(`^ {2}${unit}:$`, 'mu')), unit).toBe(1);
    }
  });

  it('are exactly the standalone workers-manifest class', () => {
    const manifest = loadManifest();
    expect([...manifest.standalone].sort((a, b) => a.localeCompare(b))).toEqual(
      Object.keys(APEX).sort((a, b) => a.localeCompare(b)),
    );
    const listed = Object.values(manifest).filter(Array.isArray).flat();
    for (const unit of Object.keys(APEX)) expect(listed.filter((u) => u === unit)).toHaveLength(1);
  });

  it('own their dev port, Worker name and allowed host, with no route', () => {
    for (const [unit, { port, host }] of Object.entries(APEX)) {
      expect(existsSync(join(repoRoot, unit, 'package.json')), unit).toBe(true);
      expect(read(`${unit}/package.json`)).toContain(`vite dev --port ${port} `);
      expect(read(`${unit}/vite.config.ts`)).toContain(`allowedHosts: ['${host}']`);
      const config = parseJsonc(read(`${unit}/wrangler.jsonc`));
      expect(config.name).toBe(`umaxica-apps-edge-${unit.replace('/', '-')}`);
      // ADR 027: the apex hostnames stay with the Tunnel until an operator
      // moves them. A route here would claim a hostname from the repository.
      expect(config.routes, unit).toEqual([]);
      for (const env of Object.values(config.env ?? {}) as { routes?: unknown }[]) {
        expect(env.routes, unit).toEqual([]);
      }
    }
  });

  it('claim each production apex hostname once across all units', () => {
    // One owner per FQDN in this repository: no other unit may allow an apex host.
    const allowed = new Map<string, string[]>();
    for (const unit of loadManifest().standalone as string[]) {
      for (const m of read(`${unit}/vite.config.ts`).matchAll(/allowedHosts: \[([^\]]*)\]/gu)) {
        for (const h of m[1].matchAll(/'([^']+)'/gu)) {
          allowed.set(h[1], [...(allowed.get(h[1]) ?? []), unit]);
        }
      }
    }
    for (const [unit, { host }] of Object.entries(APEX)) {
      expect(allowed.get(host), host).toEqual([unit]);
    }
  });

  it('each own one Compose service, published port and Dev Container forward', () => {
    const compose = read('compose.yaml');
    const devCompose = read('.devcontainer/compose.yaml');
    const devcontainer = read('.devcontainer/devcontainer.json');
    for (const unit of REINTRODUCED) {
      const { port } = APEX[unit];
      expect(count(compose, new RegExp(`^ {2}${unit.replace('/', '-')}:$`, 'mu')), unit).toBe(1);
      expect(count(compose, `'127.0.0.1:${port}:${port}'`), unit).toBe(1);
      expect(count(devCompose, `'127.0.0.1:${port}:${port}' # ${unit}`), unit).toBe(1);
      expect(count(devcontainer, `"${port}": {`), unit).toBe(1);
    }
  });

  it('each appear once in every CI unit matrix', () => {
    const integration = read('.github/workflows/integration.yaml');
    for (const unit of REINTRODUCED) {
      const id = unit.replace('/', '-');
      expect(count(integration, `unit: ${id}, dir: ${unit} }`), unit).toBe(1);
    }
    // Every `target:` matrix lists every apex unit exactly once.
    const targets = [...integration.matchAll(/^ {8}target:\n((?: {10}- .*\n)+)/gmu)];
    expect(targets.length).toBeGreaterThan(0);
    for (const [, list] of targets) {
      for (const unit of Object.keys(APEX)) {
        expect(count(list, new RegExp(`^ {10}- ${unit}$`, 'mu')), unit).toBe(1);
      }
    }
    for (const file of readdirSync(join(repoRoot, '.github/workflows'))) {
      expect(read(`.github/workflows/${file}`)).not.toContain('Retired Edge Worker');
    }
  });

  it('are accepted by the preview deploy allowlist and the local checker', () => {
    const deploy = read('scripts/deploy-edge-preview');
    expect(deploy).not.toContain('Retired Edge Worker directory');
    const local = read('scripts/check-local');
    const domains = read('scripts/check-apex-domains');
    for (const unit of REINTRODUCED) {
      expect(count(deploy, new RegExp(`\\b${unit}\\b`, 'u')), unit).toBe(1);
      const { port, host } = APEX[unit];
      expect(count(local, `'${unit}|http://127.0.0.1:${port}/api/v0/health.json'`), unit).toBe(1);
      expect(count(domains, `'${host}'`), host).toBe(1);
    }
    // The pre-ADR-024 health document no longer exists anywhere.
    expect(local).not.toMatch(/:\d+\/health\.json/u);
    expect(domains).not.toContain('/health.json');
  });

  it('are connectivity-acceptance tunnel surfaces once each', () => {
    const units = loadTunnelSurfaces().map((surface) => surface.ws);
    for (const unit of Object.keys(APEX)) expect(units.filter((u) => u === unit)).toHaveLength(1);
  });
});
