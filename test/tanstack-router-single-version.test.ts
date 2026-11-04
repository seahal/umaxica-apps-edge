import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '..');

/**
 * `@tanstack/react-start` names one exact `@tanstack/react-router` release as a
 * `dependency`, not a peer range. The catalog gives both a `^` range
 * (adr/026-tanstack-start-stable-caret-range.md), so the day Router publishes
 * ahead of Start, a fresh resolution can install the newer Router for the units
 * beside the exact one Start uses. Nothing fails: two router instances load,
 * and route context, `notFound()` and `redirect()` checks that compare against
 * one instance stop matching the other.
 *
 * The lockfile's `packages:` section lists each resolved version once, so more
 * than one `@tanstack/react-router@` key there is exactly that state.
 */

function resolvedVersions(name: string): string[] {
  const lockfile = readFileSync(join(repoRoot, 'pnpm-lock.yaml'), 'utf8');
  // pnpm writes the lockfile as two YAML documents; the first (the package
  // manager's own environment) has its own `packages:`, so take the last pair.
  const packages = lockfile.slice(
    lockfile.lastIndexOf('\npackages:\n'),
    lockfile.lastIndexOf('\nsnapshots:\n'),
  );
  const pattern = new RegExp(`^  '${name.replace('/', '\\/')}@([^']+)':$`, 'gmu');
  return [...packages.matchAll(pattern)].map((match) => match[1] ?? '');
}

describe('TanStack Router single version', () => {
  it('resolves exactly one @tanstack/react-router', () => {
    expect(resolvedVersions('@tanstack/react-router')).toHaveLength(1);
  });

  it('resolves exactly one @tanstack/react-start', () => {
    expect(resolvedVersions('@tanstack/react-start')).toHaveLength(1);
  });
});
