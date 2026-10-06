import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadManifest, repoRoot } from '../tools/lib/wrangler-config.mjs';
import { loadTunnelSurfaces } from '../tools/verify-edge-connectivity.mjs';

/**
 * app/apex, com/apex and org/apex were retired as deployment units by
 * adr/024-retire-app-com-org-apex-units.md, which vacates the apex hostnames
 * for the future Experience (xper) authority. A missing directory alone is
 * not evidence of that: a unit can come back through any edge of the
 * deployment graph. Each test below closes one of those edges.
 */
const RETIRED = ['app/apex', 'com/apex', 'org/apex'] as const;
const RETAINED = ['dev/apex', 'net/apex'] as const;
const RETIRED_PORTS = ['5101', '5301', '5401'] as const;

const read = (path: string) => readFileSync(join(repoRoot, path), 'utf8');

const workspacePackages = () =>
  [...read('pnpm-workspace.yaml').matchAll(/^ {2}- ([a-z]+\/[a-z]+)$/gmu)].map((m) => m[1]);

describe('retired app/com/org apex deployment units', () => {
  it('are absent from the pnpm workspace, retained apex units are present', () => {
    const packages = workspacePackages();
    for (const unit of RETIRED) expect(packages).not.toContain(unit);
    for (const unit of RETAINED) expect(packages).toContain(unit);
  });

  it('are absent from the lockfile importers', () => {
    const importers = [...read('pnpm-lock.yaml').matchAll(/^ {2}([a-z]+\/[a-z]+):$/gmu)].map(
      (m) => m[1],
    );
    for (const unit of RETIRED) expect(importers).not.toContain(unit);
    for (const unit of RETAINED) expect(importers).toContain(unit);
  });

  it('are absent from every workers-manifest class', () => {
    const manifest = loadManifest();
    const listed = Object.values(manifest).filter(Array.isArray).flat();
    for (const unit of RETIRED) expect(listed).not.toContain(unit);
    expect([...manifest.standalone].sort((a, b) => a.localeCompare(b))).toEqual([...RETAINED]);
  });

  it('are not tracked as directories', () => {
    for (const unit of RETIRED)
      expect(existsSync(join(repoRoot, unit, 'package.json'))).toBe(false);
  });

  it('are rejected by the preview deploy script before any Cloudflare call', () => {
    for (const unit of RETIRED) {
      const result = spawnSync('bash', [join(repoRoot, 'scripts/deploy-edge-preview'), unit], {
        encoding: 'utf8',
        // No wrangler on PATH: a script that got past the allowlist would fail
        // differently, so exit 64 proves the allowlist rejected it.
        env: { PATH: '/usr/bin:/bin' },
      });
      expect(result.status).toBe(64);
      expect(result.stderr).toContain('Retired Edge Worker directory');
    }
  });

  it('own no Compose service, published port or Dev Container forward', () => {
    for (const file of [
      'compose.yaml',
      '.devcontainer/compose.yaml',
      '.devcontainer/devcontainer.json',
    ]) {
      const source = read(file);
      for (const unit of RETIRED) {
        expect(source, `${file} names ${unit}`).not.toContain(unit);
        expect(source, `${file} names ${unit} service`).not.toMatch(
          new RegExp(`^\\s*${unit.replace('/', '-')}:`, 'mu'),
        );
      }
      for (const port of RETIRED_PORTS) {
        expect(source, `${file} publishes ${port}`).not.toMatch(new RegExp(`\\b${port}\\b`, 'u'));
      }
    }
  });

  it('are absent from every CI workflow', () => {
    const dir = join(repoRoot, '.github/workflows');
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), 'utf8');
      for (const unit of RETIRED) {
        expect(source, `${file} names ${unit}`).not.toContain(unit);
        expect(source, `${file} names ${unit}`).not.toContain(unit.replace('/', '-'));
      }
    }
  });

  it('are absent from the local and production health checkers', () => {
    const local = read('scripts/check-local');
    for (const unit of RETIRED) expect(local).not.toContain(`'${unit}|`);
    const domains = read('scripts/check-apex-domains');
    for (const host of ['umaxica.app', 'umaxica.com', 'umaxica.org']) {
      expect(domains).not.toContain(`'${host}|`);
    }
  });

  it('are not connectivity-acceptance surfaces', () => {
    const units = loadTunnelSurfaces().map((surface) => surface.ws);
    for (const unit of RETIRED) expect(units).not.toContain(unit);
    expect(units).toContain('net/apex');
  });

  it('hold no rate-limit namespace allocation', () => {
    const table =
      read('tools/lib/rate-limit-namespaces.mjs') +
      read('test/rate-limit-namespace-allocation.test.ts');
    for (const unit of RETIRED) expect(table).not.toContain(`'${unit}'`);
  });
});
