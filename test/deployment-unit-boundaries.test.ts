import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '..');

/**
 * The single owner of the "no deployment unit imports another deployment unit"
 * invariant. Neither of the two obvious homes can hold it:
 *
 * - `.oxlintrc.json` matches import SPECIFIER text, so it cannot tell
 *   `app/core -> app/docs` (written `../../../docs/...`) from a legitimate
 *   within-unit `src/app/docs/...` reference. Unit names — core, docs, info,
 *   news, help — are ordinary directory names inside a unit, so any pattern
 *   broad enough to catch the first also rejects the second.
 * - `.dependency-cruiser.cjs` COULD express it exactly, on resolved paths with
 *   backreferences, but depcruise needs TypeScript's programmatic API and
 *   declares `typescript` >=2 <7. TypeScript 7.0 does not ship that API — 7.1
 *   is the stated target — so depcruise reports
 *   `missing-typescript-transpiler`, cruises 0 dependencies out of 1000+ TS
 *   sources and exits green. A rule there would never fire.
 *
 * Resolving each specifier against its own directory — what this file does —
 * has neither problem. It is also what makes the repository extractable: a unit
 * that imports a sibling cannot be moved to its own repository.
 */

function trackedFiles(): string[] {
  const injected = process.env['EDGE_TRACKED_FILES'];
  if (injected !== undefined) {
    return injected.split('\n').filter(Boolean);
  }
  return execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

/** The deployment units, read from the mechanical source of truth. */
function deploymentUnits(): string[] {
  const workspaces = readFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
  const packages = workspaces.match(/^packages:\n((?:\s+-\s+\S+\n)+)/mu)?.[1];
  if (!packages) throw new Error('pnpm-workspace.yaml has no packages: block');
  return packages
    .split('\n')
    .map((line) => line.replace(/^\s*-\s*/u, '').trim())
    .filter(Boolean);
}

const units = deploymentUnits();

/** The unit a repo-relative path belongs to, or null for root/tooling files. */
function owningUnit(repoRelativePath: string): string | null {
  const normalized = repoRelativePath.split(sep).join('/');
  return units.find((unit) => normalized === unit || normalized.startsWith(`${unit}/`)) ?? null;
}

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.astro'];

// `from '...'`, `import '...'`, `import('...')` and `require('...')`, single or
// double quoted. Only relative specifiers can cross a unit boundary — a bare
// specifier resolves through node_modules, which the package-dependency test
// below covers instead.
const RELATIVE_SPECIFIER = /(?:\bfrom\s*|\bimport\s*|\brequire\s*)\(?\s*['"](\.[^'"]*)['"]/gu;

function sourceFilesUnderUnits(): { path: string; unit: string }[] {
  return (
    trackedFiles()
      .filter((path) => SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension)))
      // `git ls-files` still lists files deleted in the working tree.
      .filter((path) => existsSync(join(repoRoot, path)))
      .flatMap((path) => {
        const unit = owningUnit(path);
        return unit ? [{ path, unit }] : [];
      })
  );
}

// Every `../`-prefixed path token, whatever surrounds it (quotes, a shell
// word, a CSS `url(`). Not preceded by a word character or dot, so `a../b`
// and `.../` are not paths.
const PARENT_PATH = /(?<![\w.])(\.\.\/[^\s'"`,;)\]}]*)/gu;

// Binary assets and the committed TanStack route tree (generated, and made of
// in-unit `./routes/...` specifiers only) carry no hand-written references.
const NOT_IMPLEMENTATION =
  /\.(?:md|png|jpe?g|gif|ico|webp|avif|svg|woff2?|ttf|otf)$|\/routeTree\.gen\.ts$/u;

function implementationFilesUnderUnits(): { path: string; unit: string }[] {
  return trackedFiles()
    .filter((path) => !NOT_IMPLEMENTATION.test(path))
    .filter((path) => existsSync(join(repoRoot, path)))
    .flatMap((path) => {
      const unit = owningUnit(path);
      return unit ? [{ path, unit }] : [];
    });
}

// `resolve(...)` / `join(...)` from `node:path`, bare or as `path.x(...)`.
// `.join(` on anything else (an array) is not matched.
const PATH_CALL = /(?:\bpath\.|(?<![\w$.]))(?:resolve|join)\s*\(/gu;

/** The argument text of the call whose `(` ends at `open`, or null if unbalanced. */
function callArguments(contents: string, open: number): string[] | null {
  const args: string[] = [];
  let depth = 0;
  let start = open;
  for (let i = open; i < contents.length; i += 1) {
    const char = contents[i];
    if (char === '(' || char === '[' || char === '{') depth += 1;
    else if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) {
        args.push(contents.slice(start + 1, i));
        return args.map((arg) => arg.trim()).filter(Boolean);
      }
    } else if (char === ',' && depth === 1) {
      args.push(contents.slice(start + 1, i));
      start = i;
    }
  }
  return null;
}

/**
 * The directory a `node:path` call resolves to, when every argument is static:
 * a known base (`import.meta.dirname`, `__dirname`, `process.cwd()` — a unit's
 * scripts run from the unit root) followed by string literals. Anything
 * dynamic makes the call unknowable, and an unknowable call is not a violation.
 */
function staticPathTarget(args: string[], file: string, unit: string): string | null {
  const [base, ...rest] = args;
  let from: string;
  if (base === 'import.meta.dirname' || base === '__dirname') from = dirname(file);
  else if (base === 'process.cwd()') from = join(repoRoot, unit);
  else return null;
  const segments: string[] = [];
  for (const arg of rest) {
    const literal = arg.match(/^(['"])([^'"\\]*)\1$/u);
    if (!literal) return null;
    segments.push(literal[2] as string);
  }
  return resolve(from, ...segments);
}

describe('deployment unit boundaries', () => {
  it('reads a plausible set of units from pnpm-workspace.yaml', () => {
    // Everything below is only as strong as this list. If the parse silently
    // returned nothing, every assertion would vacuously pass.
    expect(units.length).toBeGreaterThanOrEqual(20);
    expect(units).toContain('app/core');
    expect(units).toContain('net/apex');
    expect(units).toContain('dev/apex');
  });

  it('finds source files to check', () => {
    // Same guard: an empty file list would make the boundary test meaningless.
    expect(sourceFilesUnderUnits().length).toBeGreaterThan(100);
    expect(implementationFilesUnderUnits().length).toBeGreaterThan(sourceFilesUnderUnits().length);
  });

  it('never reaches outside its own deployment unit by relative path', () => {
    // Both escapes break extraction: into a sibling unit, and into the
    // repository root (`tools/`, `scripts/`, a root config, a root fixture).
    // The root is only orchestration — it will not exist next to an extracted
    // unit — so "does not resolve into another unit" is not enough.
    const violations: string[] = [];

    for (const { path, unit } of sourceFilesUnderUnits()) {
      const contents = readFileSync(join(repoRoot, path), 'utf8');
      for (const [, specifier] of contents.matchAll(RELATIVE_SPECIFIER)) {
        const target = relative(repoRoot, resolve(dirname(join(repoRoot, path)), specifier));
        if (owningUnit(target) !== unit) {
          violations.push(`${path} -> ${specifier} (resolves to ${target || '.'})`);
        }
      }
    }

    // Each unit owns its own components, types, hooks and utilities, including
    // code that is identical across units. Copy the implementation into this
    // unit rather than importing across the boundary. See CLAUDE.md.
    expect(violations).toEqual([]);
  });

  it('never names a path outside its own deployment unit in any implementation file', () => {
    // The import scan above only reads module specifiers. Configuration reaches
    // files too — a `../../tools/x.mjs` in a package.json script, a `$schema`,
    // `@import`/`@source` in a stylesheet, `main` in wrangler.jsonc, a Knip
    // `entry`, an inlang `modules` path. Any `../` token that resolves outside
    // the unit is an escape, whatever the file type. Prose (`*.md`) is exempt:
    // a unit README may cite a root ADR without depending on it.
    const violations: string[] = [];

    for (const { path, unit } of implementationFilesUnderUnits()) {
      const contents = readFileSync(join(repoRoot, path), 'utf8');
      for (const [, reference] of contents.matchAll(PARENT_PATH)) {
        const target = relative(repoRoot, resolve(dirname(join(repoRoot, path)), reference));
        if (owningUnit(target) !== unit) {
          violations.push(`${path}: ${reference} (resolves to ${target || '.'})`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('never builds a path outside its own deployment unit with node:path', () => {
    // `resolve(import.meta.dirname, '..', '..', 'tools')` escapes without a
    // single `../` token, so the text scan above cannot see it. Only calls whose
    // arguments are all static are judged; see staticPathTarget.
    const violations: string[] = [];

    for (const { path, unit } of sourceFilesUnderUnits()) {
      const contents = readFileSync(join(repoRoot, path), 'utf8');
      if (!/['"](?:node:)?path['"]/u.test(contents)) continue;
      for (const match of contents.matchAll(PATH_CALL)) {
        const open = (match.index ?? 0) + match[0].length - 1;
        const args = callArguments(contents, open);
        if (!args) continue;
        const target = staticPathTarget(args, join(repoRoot, path), unit);
        if (target === null) continue;
        const repoRelative = relative(repoRoot, target);
        if (owningUnit(repoRelative) !== unit) {
          violations.push(`${path}: ${match[0]}${args.join(', ')}) -> ${repoRelative || '.'}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('never declares another deployment unit as a package dependency', () => {
    const violations: string[] = [];
    const unitPackageNames = new Map<string, string>();

    for (const unit of units) {
      const manifestPath = join(repoRoot, unit, 'package.json');
      if (!existsSync(manifestPath)) continue;
      unitPackageNames.set(JSON.parse(readFileSync(manifestPath, 'utf8')).name, unit);
    }

    for (const unit of units) {
      const manifestPath = join(repoRoot, unit, 'package.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const declared = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
        ...manifest.optionalDependencies,
      };
      for (const [name, range] of Object.entries(declared)) {
        // A sibling reached by package name, or by any protocol that points at
        // a path — all of them survive `pnpm install` and all of them break
        // extraction just as badly as a relative import.
        if (unitPackageNames.has(name) && unitPackageNames.get(name) !== unit) {
          violations.push(`${unit} depends on ${name} (${unitPackageNames.get(name)})`);
        }
        if (typeof range === 'string' && /^(workspace|link|file):/u.test(range)) {
          violations.push(`${unit} depends on ${name} via ${range}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  // The three checks below cover the *tooling* half of extractability. The two
  // above prove a unit's source does not reach a sibling; these prove the unit
  // can still be linted, typechecked and tested once the repository root is
  // gone. They were previously only prose in each unit's knip.jsonc.

  it('never extends a tsconfig outside its own deployment unit', () => {
    const violations: string[] = [];

    for (const unit of units) {
      const tsconfigPath = join(repoRoot, unit, 'tsconfig.json');
      if (!existsSync(tsconfigPath)) continue;
      // tsconfig.json is JSONC (comments, trailing commas), so read the one
      // field this test cares about directly rather than parsing the whole file.
      const raw = readFileSync(tsconfigPath, 'utf8');
      const single = raw.match(/"extends"\s*:\s*"([^"]+)"/u);
      const array = raw.match(/"extends"\s*:\s*\[([^\]]*)\]/u);
      const targets = single
        ? [single[1] as string]
        : array
          ? [...(array[1] as string).matchAll(/"([^"]+)"/gu)].map((m) => m[1] as string)
          : [];
      if (targets.length === 0) continue;
      for (const target of targets) {
        // A bare specifier resolves through node_modules (a real dependency),
        // which survives extraction. Only a relative path can escape the unit.
        if (!target.startsWith('.')) continue;
        const resolved = relative(repoRoot, resolve(dirname(tsconfigPath), target));
        if (owningUnit(resolved) !== unit) {
          violations.push(`${unit}/tsconfig.json extends ${target} (${resolved})`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('declares every package its tsconfig loads through "types"', () => {
    // `"types": ["node"]` resolves `@types/node` the same way an import does,
    // so an undeclared entry only works while the root happens to hoist it.
    const violations: string[] = [];

    for (const unit of units) {
      const tsconfigPath = join(repoRoot, unit, 'tsconfig.json');
      const manifestPath = join(repoRoot, unit, 'package.json');
      if (!existsSync(tsconfigPath) || !existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const declared = new Set(
        Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }),
      );
      const list = readFileSync(tsconfigPath, 'utf8').match(/"types"\s*:\s*\[([^\]]*)\]/u);
      for (const [, entry] of (list?.[1] ?? '').matchAll(/"([^"]+)"/gu)) {
        if (entry === undefined || entry.startsWith('.')) continue;
        const name = entry.startsWith('@')
          ? entry.split('/').slice(0, 2).join('/')
          : (entry.split('/')[0] as string);
        if (!declared.has(name) && !declared.has(`@types/${name}`)) {
          violations.push(`${unit}/tsconfig.json types "${entry}" is not a declared dependency`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('owns the tooling configuration needed to run standalone', () => {
    const required = ['vitest.config.ts', 'vitest.setup.ts', '.oxlintrc.json', '.oxfmtrc.json'];
    const missing: string[] = [];

    for (const unit of units) {
      for (const file of required) {
        if (!existsSync(join(repoRoot, unit, file))) missing.push(`${unit}/${file}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('declares every tool binary its own scripts invoke', () => {
    // Binaries provided by the runtime/toolchain rather than by a package, or
    // supplied by the deployment platform itself.
    const ambient = new Set(['node', 'pnpm', 'echo', 'rm', 'cp', 'mkdir', 'cd']);
    // Binary name -> the package that provides it, where they differ.
    const provider: Record<string, string> = {
      tsc: 'typescript',
      playwright: '@playwright/test',
      vitest: 'vitest',
      // Hurl is a Rust binary; `@orangeopensource/hurl` is its npm distribution
      // and ships the bins `hurl` and `hurlfmt`. The command word and the
      // package name differ, which is exactly what this map is for.
      hurl: '@orangeopensource/hurl',
      hurlfmt: '@orangeopensource/hurl',
    };
    const violations: string[] = [];

    for (const unit of units) {
      const manifestPath = join(repoRoot, unit, 'package.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const declared = new Set(
        Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }),
      );

      for (const [scriptName, body] of Object.entries(manifest.scripts ?? {})) {
        for (const segment of String(body).split(/&&|\|\||;|\|/u)) {
          // Strip leading `VAR=value` assignments, then take the command word.
          const command = segment
            .trim()
            .replace(/^(?:\w+=\S*\s+)+/u, '')
            .split(/\s+/u)[0];
          if (!command || ambient.has(command)) continue;
          // `pnpm run <other>` is an intra-unit reference, not a binary.
          if (command.startsWith('pnpm')) continue;
          const pkg = provider[command] ?? command;
          if (!declared.has(pkg)) {
            violations.push(`${unit}: script "${scriptName}" runs undeclared binary "${command}"`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
