#!/usr/bin/env node
// Local preview for an Astro content surface.
//
// `astro build` writes dist/astro/server/wrangler.json with the production
// VPC binding at the top level (the top level IS production). `wrangler dev`
// then tries a remote VPC session and dies without CLOUDFLARE_API_TOKEN.
// Strip the binding for preview only — production deploy still uses the
// generated file as-is.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const serverDir = join(process.cwd(), 'dist/astro/server');
const sourcePath = join(serverDir, 'wrangler.json');
const previewPath = join(serverDir, 'wrangler.preview.json');

const config = JSON.parse(readFileSync(sourcePath, 'utf8'));
delete config.vpc_services;
writeFileSync(previewPath, JSON.stringify(config));

const wrangler = join(process.cwd(), 'node_modules/.bin/wrangler');
const child = spawn(wrangler, ['dev', '--config', previewPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, CLOUDFLARE_ENV: '' },
});
child.on('exit', (code) => process.exit(code ?? 1));
