#!/usr/bin/env node
// Validates every workspace's wrangler.jsonc against tools/workers-manifest.json.
// Run from the repo root: node tools/check-workers.mjs (pnpm run check:workers).

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'tools/workers-manifest.json'), 'utf8'));

// Strip // and /* */ comments plus trailing commas without touching string contents.
function parseJsonc(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const two = text.slice(i, i + 2);
    if (inString) {
      out += text[i];
      if (text[i] === '\\') {
        out += text[i + 1] ?? '';
        i++;
      } else if (text[i] === '"') {
        inString = false;
      }
    } else if (text[i] === '"') {
      inString = true;
      out += text[i];
    } else if (two === '//') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (two === '/*') {
      i += 2;
      while (i < text.length && text.slice(i, i + 2) !== '*/') i++;
      i++;
    } else {
      out += text[i];
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

const failures = [];
const fail = (ws, message) => failures.push(`${ws}: ${message}`);

function loadWrangler(ws) {
  const path = join(root, ws, 'wrangler.jsonc');
  if (!existsSync(path)) {
    fail(ws, 'wrangler.jsonc is missing');
    return null;
  }
  try {
    return parseJsonc(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(ws, `wrangler.jsonc failed to parse: ${error.message}`);
    return null;
  }
}

function vpcBindings(config) {
  const collected = [...(config.vpc_services ?? [])];
  for (const env of Object.values(config.env ?? {})) {
    collected.push(...(env.vpc_services ?? []));
  }
  return collected;
}

function checkOpenNext(ws, config) {
  if (!config.compatibility_flags?.includes('nodejs_compat')) {
    fail(ws, 'compatibility_flags must include nodejs_compat');
  }
  if (config.assets?.binding !== 'ASSETS') {
    fail(ws, 'assets binding ASSETS is missing');
  }
  if (!(config.services ?? []).some((s) => s.binding === 'WORKER_SELF_REFERENCE')) {
    fail(ws, 'services binding WORKER_SELF_REFERENCE is missing');
  }
  if (config.images?.binding !== 'IMAGES') {
    fail(ws, 'images binding IMAGES is missing');
  }
  if (!existsSync(join(root, ws, 'public/_headers'))) {
    fail(ws, 'public/_headers is missing');
  }
}

for (const ws of manifest.railsBacked) {
  const config = loadWrangler(ws);
  if (!config) continue;
  checkOpenNext(ws, config);
  for (const envName of ['development', 'production']) {
    const bindings = config.env?.[envName]?.vpc_services ?? [];
    if (!bindings.some((v) => v.binding === manifest.vpcBinding)) {
      fail(ws, `env.${envName} must declare vpc_services binding ${manifest.vpcBinding}`);
    }
  }
}

for (const ws of manifest.contentSurface) {
  const config = loadWrangler(ws);
  if (!config) continue;
  checkOpenNext(ws, config);
  if (vpcBindings(config).length > 0) {
    fail(
      ws,
      'contentSurface workers must not declare vpc_services (add the binding together with a Rails client implementation, then reclassify as railsBacked)',
    );
  }
}

for (const ws of manifest.standalone) {
  const config = loadWrangler(ws);
  if (!config) continue;
  if (vpcBindings(config).length > 0) {
    fail(ws, 'standalone workers must not declare vpc_services');
  }
}

if (failures.length > 0) {
  process.stderr.write(`check-workers: FAIL\n${failures.map((line) => `  - ${line}\n`).join('')}`);
  process.exit(1);
}

const checked =
  manifest.railsBacked.length + manifest.contentSurface.length + manifest.standalone.length;
process.stdout.write(`check-workers: OK (${checked} workers validated)\n`);
