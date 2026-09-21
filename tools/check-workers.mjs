#!/usr/bin/env node
// Validates every workspace's wrangler.jsonc against tools/workers-manifest.json.
// Run from the repo root: node tools/check-workers.mjs (pnpm run check:workers).

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AUTH_RATE_LIMITER_BUDGET,
  ENV_PREFIX,
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
} from './lib/rate-limit-namespaces.mjs';
import {
  collectVpcBindings as vpcBindings,
  loadManifest,
  parseJsonc,
  readWranglerConfig,
  repoRoot as root,
} from './lib/wrangler-config.mjs';

const manifest = loadManifest();

const failures = [];
const fail = (ws, message) => failures.push(`${ws}: ${message}`);

function loadWrangler(ws) {
  const { config, error } = readWranglerConfig(join(ws, 'wrangler.jsonc'));
  if (error) {
    fail(ws, error.slice(`${ws}/`.length));
    return null;
  }
  return config;
}

// Keys Wrangler does NOT inherit into `env.*`. A key present at the top level
// but absent from an environment silently drops that binding once `--env` is
// passed, so every environment has to repeat them.
//
// `vpc_services` is deliberately NOT in this list even though wrangler treats it
// the same way. "Repeat it everywhere" is a syntax rule; which environment may
// hold a Rails transport is an architecture decision, and the two disagree —
// `env.test` must carry no VPC binding at all. It gets its own per-environment
// policy below instead.
const NON_INHERITABLE = [
  'vars',
  'kv_namespaces',
  'services',
  'images',
  'version_metadata',
  'ratelimits',
  'durable_objects',
  'r2_buckets',
  'd1_databases',
  'queues',
];

// `production` is deliberately absent from this list — the top level is
// production, and the assertion below is that `env.production` does NOT exist.
function checkEnvironments(ws, config, requiredEnvs = ['development', 'test']) {
  for (const envName of requiredEnvs) {
    if (!config.env?.[envName]) {
      fail(ws, `env.${envName} is missing`);
    }
  }

  // Every deployment unit is rate limited, at every tier it deploys to.
  //
  // `ratelimits` is one of the NON_INHERITABLE keys above, so a top-level
  // declaration is silently absent the moment `--env` is passed. That failure is
  // invisible at runtime: `checkRateLimit` treats an unbound limiter as a
  // pass-through by design (a local loop that rate-limits itself is a worse
  // contract than one that does not), so a dropped binding does not throw, log,
  // or change a single response — it just quietly stops limiting. Config is the
  // only place it can be caught, which is why it is asserted here rather than
  // left to a unit test.
  //
  // Only the twenty units in the manifest reach this function. `all/busy` (a
  // maintenance page answering 503 straight from the assets binding) and
  // `tools/vpc-probe` (never deployed, no environments) are outside it, and are
  // exempt for those reasons rather than by oversight.
  const requireLimiter = (label, ratelimits) => {
    const declared = ratelimits ?? [];
    if (!declared.some((limit) => limit.name === 'RATE_LIMITER')) {
      fail(ws, `${label} declares no RATE_LIMITER — ratelimits is not inherited into env.*`);
      return;
    }
    for (const limit of declared) {
      // A limiter with no budget is not a limiter. Wrangler accepts the block
      // and the binding resolves, so nothing downstream would notice.
      if (typeof limit.simple?.limit !== 'number' || typeof limit.simple?.period !== 'number') {
        fail(ws, `${label} ratelimit ${limit.name} needs numeric simple.limit and simple.period`);
      }
      if (limit.name === 'RATE_LIMITER') {
        if (
          limit.simple?.limit !== RATE_LIMITER_BUDGET.limit ||
          limit.simple?.period !== RATE_LIMITER_BUDGET.period
        ) {
          fail(
            ws,
            `${label} RATE_LIMITER must stay ${RATE_LIMITER_BUDGET.limit}/${RATE_LIMITER_BUDGET.period} — namespace isolation is not budget tuning`,
          );
        }
      }
      if (limit.name === 'AUTH_RATE_LIMITER') {
        if (
          limit.simple?.limit !== AUTH_RATE_LIMITER_BUDGET.limit ||
          limit.simple?.period !== AUTH_RATE_LIMITER_BUDGET.period
        ) {
          fail(
            ws,
            `${label} AUTH_RATE_LIMITER must stay ${AUTH_RATE_LIMITER_BUDGET.limit}/${AUTH_RATE_LIMITER_BUDGET.period}`,
          );
        }
      }
    }
  };

  requireLimiter('the top level (production)', config.ratelimits);
  for (const envName of requiredEnvs) {
    if (config.env?.[envName]) requireLimiter(`env.${envName}`, config.env[envName].ratelimits);
  }

  // Rate limiter counters are per-namespace_id, so sharing one across tiers lets
  // local/CI traffic burn production's budget. namespace_id is plain config, not
  // a provisioned resource, so every tier can simply pick its own.
  //
  // Seeded from the top level, which IS production: an env reusing a production
  // namespace_id is the worst version of this collision, and checking only
  // env-against-env missed exactly that one.
  //
  // Keyed on the namespace_id ALONE, never on `name:namespace_id`. A counter is
  // identified by its namespace; the binding name is just how the Worker reaches
  // it. Including the name in the key made two DIFFERENTLY named bindings on one
  // namespace invisible — which is precisely the collision that matters most
  // here, because `AUTH_RATE_LIMITER` exists to be a budget that RATE_LIMITER
  // cannot spend. Sharing an id would silently merge the two back into the one
  // limiter the split exists to undo, and the deploy output would still print
  // two bindings.
  const rateLimitIds = new Map();
  const noteId = (limit, where) => {
    const seen = rateLimitIds.get(limit.namespace_id);
    if (seen) {
      const bindings = seen.name === limit.name ? limit.name : `${seen.name} and ${limit.name}`;
      fail(
        ws,
        `${where} uses ratelimit namespace_id ${limit.namespace_id}, already used by ${seen.where} (${bindings}) — one namespace is one counter`,
      );
      return;
    }
    rateLimitIds.set(limit.namespace_id, { where, name: limit.name });
  };

  for (const limit of config.ratelimits ?? []) noteId(limit, 'production (top level)');
  for (const [envName, env] of Object.entries(config.env ?? {})) {
    for (const limit of env.ratelimits ?? []) noteId(limit, `env.${envName}`);
  }

  // The top level IS production; there is no `env.production`.
  //
  // A wrangler environment deploys to a separate Worker named `<name>-<env>`,
  // so an `env.production` has to re-declare `name` purely to cancel that out.
  // Putting production at the top level means `wrangler deploy` with no `--env`
  // is the production deploy, which is the shape Cloudflare's own model expects.
  if (config.env?.production) {
    fail(
      ws,
      'env.production must not exist — the top level is production, so `wrangler deploy` with no --env deploys it',
    );
  }
  if (config.vars?.EDGE_ENV !== 'production') {
    fail(ws, 'top-level vars must set EDGE_ENV to production — the top level is production');
  }

  // `CLOUDFLARE_ENV` is wrangler's own control variable, not ours to bind.
  //
  // `opennextjs-cloudflare upload` resolves the Worker's vars through
  // `getPlatformProxy()` and writes every string one straight into
  // `process.env` (getEnvFromPlatformProxy: `const envVars = process.env`),
  // then spawns wrangler with that env. A var named CLOUDFLARE_ENV therefore
  // comes back as `--env=<value>`; with "production" — the value the top level
  // would naturally carry — wrangler looks for an `env.production` that by
  // design does not exist and the upload dies. Measured, not assumed.
  //
  // That is why the tier is exposed as EDGE_ENV. Keep the two apart.
  for (const [envName, env] of [['<top level>', config], ...Object.entries(config.env ?? {})]) {
    if (env.vars?.CLOUDFLARE_ENV !== undefined) {
      fail(
        ws,
        `${envName} vars must not bind CLOUDFLARE_ENV — it is wrangler's control variable and leaks into the deploy as \`--env\`; use EDGE_ENV`,
      );
    }
  }

  for (const [envName, env] of Object.entries(config.env ?? {})) {
    const missing = NON_INHERITABLE.filter(
      (key) => config[key] !== undefined && env[key] === undefined,
    );
    if (missing.length > 0) {
      fail(ws, `env.${envName} is missing non-inheritable keys: ${missing.join(', ')}`);
    }
  }
}

// Where a Rails-backed Worker may hold the Workers VPC binding, and on which
// terms. This models the architecture rather than wrangler's syntax: wrangler
// would happily accept the binding in `env.test`, and the reason it must not be
// there is ours, not the tool's.
//
// `remote` is a LOCAL-development flag. It makes wrangler run this Worker's code
// in local workerd and proxy only the binding out to the real Cloudflare
// resource; on a deployed Worker it means nothing, because there is no local
// simulation to override.
// https://developers.cloudflare.com/workers/development-testing/#remote-bindings
//
// So `remote: true` in `env.vpc` is required (local workerd cannot simulate a
// VPC Service) and its absence at the top level is required too — not because a
// deployed Worker would break, but because a key that does nothing where it sits
// reads as though it does something.
//
// serviceId is read from the manifest per tier: the two ids are equal during the
// AWS bootstrap and stop being equal at cutover, and this table does not care
// which of those is true today.
const VPC_POLICY = [
  {
    // The top level IS production. During the bootstrap it points at the
    // development VPC Service on purpose — see the manifest and ADR 006.
    label: 'top-level (production)',
    read: (config) => config.vpc_services,
    required: true,
    remote: false,
    serviceId: (m) => m.vpcProductionServiceId,
  },
  {
    // `pnpm preview:vpc` — local workerd against the real development Service.
    label: 'env.vpc',
    read: (config) => config.env?.vpc?.vpc_services,
    required: true,
    remote: true,
    serviceId: (m) => m.vpcDevelopmentServiceId,
  },
  {
    // The ordinary development loop, which now reaches Rails over the real
    // binding. This costs `pnpm dev` and `pnpm preview` an interactive
    // `wrangler login`: a VPC Service has no local simulator, so resolving this
    // environment always opens a remote proxy session, and that session rejects
    // API-token authentication. Measured; ADR 006 records it.
    label: 'env.development',
    read: (config) => config.env?.development?.vpc_services,
    required: true,
    remote: true,
    serviceId: (m) => m.vpcDevelopmentServiceId,
  },
  {
    // Never deployed and never given a Rails transport: a test tier that can
    // reach a real Rails is not a test tier.
    label: 'env.test',
    read: (config) => config.env?.test?.vpc_services,
    required: false,
  },
  {
    // `local` exists only on the Vite-built frames, and its whole point is that
    // it declares no VPC Service: wrangler treats one as a resource with no local
    // simulator, so any environment naming it forces a remote proxy session that
    // needs an interactive `wrangler login`. Declaring one here would put that
    // back in the everyday loop and in CI, which has no credentials at all.
    label: 'env.local',
    read: (config) => config.env?.local?.vpc_services,
    required: false,
  },
];

function checkVpcPolicy(ws, config) {
  for (const rule of VPC_POLICY) {
    const declared = (rule.read(config) ?? []).filter((v) => v.binding === manifest.vpcBinding);

    if (!rule.required) {
      if (declared.length > 0) {
        fail(ws, `${rule.label} must not declare vpc_services binding ${manifest.vpcBinding}`);
      }
      continue;
    }

    if (declared.length !== 1) {
      fail(
        ws,
        `${rule.label} must declare vpc_services binding ${manifest.vpcBinding} exactly once (found ${declared.length})`,
      );
      continue;
    }

    const expectedId = rule.serviceId(manifest);
    if (declared[0].service_id !== expectedId) {
      fail(
        ws,
        `${rule.label} vpc_services service_id must be ${expectedId} (found ${declared[0].service_id})`,
      );
    }
    if (rule.remote && declared[0].remote !== true) {
      fail(
        ws,
        `${rule.label} vpc_services must set remote: true — local workerd cannot simulate a VPC Service`,
      );
    }
    if (!rule.remote && declared[0].remote === true) {
      fail(
        ws,
        `${rule.label} vpc_services must not set remote: true — it is a local-development flag with no meaning on a deployed Worker`,
      );
    }
  }
}

function checkOpenNext(ws, config) {
  // Next.js only accepts development|test|production, and the top level is production.
  if (config.vars?.NODE_ENV !== 'production') {
    fail(ws, 'top-level vars must set NODE_ENV to production');
  }
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
}

// The Vite counterpart of checkOpenNext.
//
// A Vite-built Worker keeps the Rails and VPC contract and drops three bindings
// that only OpenNext ever read: ASSETS (Cloudflare matches static assets before
// the Worker runs, so nothing has to serve one), WORKER_SELF_REFERENCE (an
// OpenNext requirement with no application reader) and IMAGES (only OpenNext's
// own image handler used it). It must also NOT declare `assets.directory` — the
// plugin writes that into the output wrangler.json at build time, and a value in
// the input config describes a directory the deployed Worker never uses.
// adr/012-apex-vite-build-and-static-assets.md is normative on both.
function checkViteWorker(ws, config) {
  if (config.vars?.NODE_ENV !== 'production') {
    fail(ws, 'top-level vars must set NODE_ENV to production');
  }
  if (!config.compatibility_flags?.includes('nodejs_compat')) {
    fail(ws, 'compatibility_flags must include nodejs_compat');
  }
  if (config.assets?.directory !== undefined) {
    fail(
      ws,
      'assets.directory must not be set — `vite build` writes it into the output wrangler.json, and a value here describes a directory the deployed Worker never uses',
    );
  }
  // Both "none" for the reason the apex workers pin them: Cloudflare matches
  // assets BEFORE the Worker, so a stray index.html in the build output would
  // answer `/` in place of the index route, silently and only in production.
  // `not_found_handling: "none"` is what lets the Worker produce the 404
  // document that carries the title and the security headers.
  if (config.assets?.html_handling !== 'none' || config.assets?.not_found_handling !== 'none') {
    fail(ws, 'assets.html_handling and assets.not_found_handling must both be "none"');
  }
  if (config.assets?.binding !== undefined) {
    fail(ws, 'assets binding must not be declared — nothing reads it');
  }
  if (config.images !== undefined) {
    fail(ws, 'images binding must not be declared — nothing reads it');
  }
  if ((config.services ?? []).some((s) => s.binding === 'WORKER_SELF_REFERENCE')) {
    fail(ws, 'WORKER_SELF_REFERENCE is an OpenNext requirement and must not be declared');
  }
  if (config.main?.includes('.open-next')) {
    fail(ws, 'main must not point into .open-next');
  }
}

// Static assets are the one thing that ships without any gate noticing it is
// gone. A missing .ts breaks typecheck; a missing route breaks a test. A missing
// public/ file breaks nothing until a browser 404s in production — and `wrangler
// deploy` uploads whatever is on disk, so a file that exists locally but was
// never committed passes every local check and then vanishes from CI's clean
// clone. Presence alone is therefore not enough: these have to be IN GIT.
//
// This is why the apex workers are checked too. Every unit now builds with Vite,
// which copies `public/` into `dist/client` and hands that directory to
// `assets.directory` in the OUTPUT wrangler.json — so `public/` is the source of
// truth for the deployed asset surface in every unit, and a file missing from git
// is a file missing from the deploy. The required asset set still differs by
// worker class: TanStack frames publish the offline Service Worker, while Hono
// apex workers deliberately removed that feature.
const trackedFiles = (() => {
  let cache = null;
  return () => {
    if (cache === null) {
      cache = new Set(
        execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
          .split('\n')
          .filter(Boolean),
      );
    }
    return cache;
  };
})();

// Every browser-facing Worker publishes these. `service-worker.js` is asserted
// on by test/standard-url-contract.test.ts and by each unit's standard-contract
// e2e spec, both of which read the working tree and so cannot see this gap.
const REQUIRED_PUBLIC_ASSETS = ['_headers', 'service-worker.js'];
const STANDALONE_REQUIRED_PUBLIC_ASSETS = ['_headers'];
const STANDALONE_FORBIDDEN_PUBLIC_ASSETS = [
  'service-worker.js',
  'service-worker-register.js',
  'manifest.webmanifest',
];

// The one asset that is generated rather than committed: Tailwind's output.
//
// The rule above is "must be in git", but what it is really protecting is
// "CI's clean clone produces the same bytes". A committed copy of compiled CSS
// would satisfy the letter and lose the spirit — it can silently disagree with
// the `src/style.css` it came from, and nothing would check that. So this file
// is held to the stronger property instead, asserted below: its source is
// tracked, and every script that can upload regenerates it first.
const GENERATED_PUBLIC_ASSETS = new Map([['public/style.css', 'src/style.css']]);

// Scripts that put bytes on Cloudflare, or that stand in for them locally.
// `build` is included because CI's build matrix is what proves the generation
// step works at all.
const UPLOADING_SCRIPTS = ['build', 'dev', 'deploy', 'deploy:upload', 'upload:ci', 'deploy:ci'];

function checkGeneratedAsset(ws, relative, tracked) {
  const source = GENERATED_PUBLIC_ASSETS.get(relative);
  if (!tracked.has(`${ws}/${source}`)) {
    fail(ws, `${relative} is generated from ${source}, which is not tracked by git`);
    return;
  }

  let scripts;
  try {
    scripts = JSON.parse(readFileSync(join(root, ws, 'package.json'), 'utf8')).scripts ?? {};
  } catch {
    fail(ws, 'package.json is unreadable, so the generated-asset rule cannot be checked');
    return;
  }

  if (!scripts['build:css']) {
    fail(ws, `${relative} is generated but this unit declares no build:css script`);
    return;
  }

  for (const name of UPLOADING_SCRIPTS) {
    const script = scripts[name];
    if (!script) continue;
    // Either it regenerates the asset itself, or it delegates to a script that
    // does — `preview` runs `build`, which runs `build:css`.
    if (script.includes('build:css') || script.includes('pnpm run build')) continue;
    fail(
      ws,
      `script "${name}" can upload public/ without regenerating ${relative} — prefix it with \`pnpm run build:css &&\``,
    );
  }
}

function checkPublicAssets(ws, { required = REQUIRED_PUBLIC_ASSETS, forbidden = [] } = {}) {
  const publicDir = join(root, ws, 'public');
  if (!existsSync(publicDir)) {
    fail(ws, "public/ is missing — it is this worker's deployed static asset surface");
    return;
  }

  for (const asset of required) {
    if (!existsSync(join(publicDir, asset))) {
      fail(ws, `public/${asset} is missing`);
    }
  }

  for (const asset of forbidden) {
    if (existsSync(join(publicDir, asset))) {
      fail(ws, `public/${asset} is forbidden for this worker class`);
    }
  }

  const tracked = trackedFiles();
  for (const entry of readdirSync(publicDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name).slice(root.length).replace(/^\//u, '');
    if (tracked.has(path)) continue;

    const relative = path.slice(`${ws}/`.length);
    if (GENERATED_PUBLIC_ASSETS.has(relative)) {
      checkGeneratedAsset(ws, relative, tracked);
      continue;
    }

    fail(
      ws,
      `${path} is not tracked by git — wrangler would upload it from this machine and CI would deploy without it`,
    );
  }
}

for (const ws of manifest.railsBacked) {
  const config = loadWrangler(ws);
  if (!config) continue;
  // Only railsBacked workers need `vpc` — it exists to carry the VPC binding.
  checkEnvironments(ws, config, ['development', 'vpc', 'test']);
  checkOpenNext(ws, config);
  checkPublicAssets(ws);

  checkVpcPolicy(ws, config);
}

for (const ws of manifest.railsBackedVite ?? []) {
  const config = loadWrangler(ws);
  if (!config) continue;
  // `local` is the extra tier: vite dev runs the Worker in workerd, and it is
  // the tier whose `RAILS_ORIGIN` points at the development container's Rails.
  checkEnvironments(ws, config, ['local', 'development', 'test']);
  checkViteWorker(ws, config);
  checkPublicAssets(ws);

  // The Cores reach Rails over the public internet at `RAILS_ORIGIN`, not over
  // Workers VPC — adr/018-core-rails-direct-internet.md.
  if (vpcBindings(config).length > 0) {
    fail(
      ws,
      'railsBackedVite workers must not declare vpc_services — they reach Rails at RAILS_ORIGIN',
    );
  }
}

// The twelve public content cells: the same Vite + TanStack Start Worker shape as
// the Cores (checkViteWorker), but Rails is reached over the Workers VPC binding,
// so they carry the VPC policy and a `vpc` tier. adr/019.
for (const ws of manifest.railsBackedVpcVite ?? []) {
  const config = loadWrangler(ws);
  if (!config) continue;
  checkEnvironments(ws, config, ['local', 'development', 'vpc', 'test']);
  checkViteWorker(ws, config);
  checkPublicAssets(ws);

  checkVpcPolicy(ws, config);
}

// Deploying production means running with no `--env`, and CLOUDFLARE_ENV picks
// the environment when the flag is absent. compose.yaml exports
// CLOUDFLARE_ENV=development, so a deploy script that does not blank it would
// silently ship to `<name>-development` and leave production untouched — a
// failure that looks like success. Verified with `wrangler deploy --dry-run`.
for (const ws of [
  ...manifest.railsBacked,
  ...(manifest.railsBackedVite ?? []),
  ...(manifest.railsBackedVpcVite ?? []),
  ...manifest.contentSurface,
]) {
  const pkgPath = join(root, ws, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {};
  for (const [name, body] of Object.entries(scripts)) {
    if (/--env\s+production/u.test(body)) {
      fail(ws, `${name} must not pass --env production — the top level is production`);
    }
    // Per sub-command, because a script chains several with `&&`. A segment
    // that passes `--env` is explicit and safe whatever CLOUDFLARE_ENV says;
    // one that does not is at the mercy of the variable.
    for (const segment of body.split('&&')) {
      // `vite` counts: @cloudflare/vite-plugin reads CLOUDFLARE_ENV to pick the
      // environment exactly as wrangler does, so `vite build` with the variable
      // exported would bake development vars into the production artefact.
      if (!/opennextjs-cloudflare|wrangler|\bvite\b/u.test(segment)) continue;
      if (/--env\s+\S+/u.test(segment)) continue;
      if (!segment.includes('CLOUDFLARE_ENV=')) {
        fail(
          ws,
          `${name} runs wrangler with no --env and does not blank CLOUDFLARE_ENV — the container exports it, so this would silently target <name>-development`,
        );
      }
    }
  }
}

for (const ws of manifest.contentSurface) {
  const config = loadWrangler(ws);
  if (!config) continue;
  checkEnvironments(ws, config);
  checkOpenNext(ws, config);
  checkPublicAssets(ws);
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
  checkEnvironments(ws, config);
  checkPublicAssets(ws, {
    required: STANDALONE_REQUIRED_PUBLIC_ASSETS,
    forbidden: STANDALONE_FORBIDDEN_PUBLIC_ASSETS,
  });
  if (vpcBindings(config).length > 0) {
    fail(ws, 'standalone workers must not declare vpc_services');
  }
}

// tools/vpc-probe — the diagnostic Worker behind `pnpm run check:vpc`.
//
// Its `vpc_services` sits at the TOP LEVEL, which is exactly what the fifteen
// frames above are forbidden from doing. That is not an oversight. The frames'
// rule exists because a top-level binding leaks into `env.development`, making
// every ordinary `pnpm dev` authenticate to Cloudflare. This Worker declares no
// environments at all, is absent from `pnpm-workspace.yaml`, has no deploy
// script, and sets `workers_dev: false`, so there is no environment for it to
// leak into and nothing that could ship it. Do not "fix" it to match the frames.
{
  const ws = 'tools/vpc-probe';
  const { config, error } = readWranglerConfig(`${ws}/wrangler.jsonc`);
  if (error) {
    fail(ws, error.slice(`${ws}/`.length));
  } else {
    const declared = (config.vpc_services ?? []).filter((v) => v.binding === manifest.vpcBinding);
    if (declared.length !== 1) {
      fail(
        ws,
        `top-level vpc_services must declare ${manifest.vpcBinding} exactly once (found ${declared.length})`,
      );
    }
    if (declared[0] && declared[0].service_id !== manifest.vpcDevelopmentServiceId) {
      fail(ws, `vpc_services service_id must be ${manifest.vpcDevelopmentServiceId}`);
    }
    if (declared[0] && declared[0].remote !== true) {
      fail(ws, 'vpc_services must set remote: true — local workerd cannot simulate a VPC Service');
    }
    if (config.env !== undefined) {
      fail(ws, 'must declare no environments — its binding is top-level precisely because of that');
    }
    if (config.workers_dev !== false) {
      fail(ws, 'must set workers_dev: false — the probe is never served');
    }
  }

  // Keeping it out of the workspace is what stops `pnpm -r` reaching it.
  const workspaces = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  if (workspaces.includes('tools/vpc-probe')) {
    fail(
      ws,
      'must not be listed in pnpm-workspace.yaml — a workspace entry exposes it to `pnpm -r`',
    );
  }
}

// ---------------------------------------------------------------------------
// Rate limit namespaces — adr/022-rate-limit-namespace-allocation.md
// ---------------------------------------------------------------------------
//
// A rate limit counter is keyed on (namespace_id, key) and is scoped to the
// Cloudflare ACCOUNT, not to the Worker. ADR 022 therefore gives each active
// FQDN its own general RATE_LIMITER namespace: `<env-prefix><dev-port><region>`,
// with region `00` for global surfaces and `81` for the Japan Core. Suffix `01`
// (USA) is reserved and must not appear until that Core exists. Sharing a
// RATE_LIMITER namespace across deployment units is prohibited.
//
// Jump lives in umaxica-apps-edge-jump. Its production id 520900 is seeded into
// the uniqueness map so this repository cannot copy it. AUTH_RATE_LIMITER stays
// on the historical X10N series and is not derived from the FQDN formula.
function developmentPort(ws, brand, surface) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join(root, ws, 'package.json'), 'utf8'));
  } catch {
    fail(ws, 'package.json is unreadable, so the rate-limit namespace cannot be checked');
    return null;
  }
  const port = developmentPortFromDevScript(pkg.scripts?.dev);
  if (!port) {
    fail(
      ws,
      'scripts.dev must declare --port NNNN — rate-limit namespaces are allocated from the development port',
    );
    return null;
  }
  const expectedPort = expectedDevelopmentPort(brand, surface);
  if (expectedPort && port !== expectedPort) {
    fail(
      ws,
      `scripts.dev --port ${port} must be ${expectedPort} (${brand}/${surface}) — namespace ids are derived from that port`,
    );
  }
  return port;
}

function seedAccountWideNamespaces(byNamespace) {
  byNamespace.set(
    JUMP.productionNamespaceId,
    `${JUMP.repo} production ${JUMP.binding} (${JUMP.port}${JUMP.region})`,
  );
  for (const id of RETIRED_NAMESPACE_IDS) {
    byNamespace.set(id, `retired historical namespace_id ${id}`);
  }
  for (const id of RESERVED_USA_CORE_NAMESPACE_IDS) {
    byNamespace.set(id, `reserved inactive USA core ${id}`);
  }

  const sibling = join(root, '..', JUMP.repo, 'wrangler.jsonc');
  if (!existsSync(sibling)) return;
  let config;
  try {
    config = parseJsonc(readFileSync(sibling, 'utf8'));
  } catch (error) {
    fail(JUMP.repo, `sibling wrangler.jsonc failed to parse: ${error.message}`);
    return;
  }
  const declared = (config.ratelimits ?? []).find((limit) => limit.name === JUMP.binding);
  if (!declared) {
    fail(JUMP.repo, `sibling wrangler.jsonc declares no ${JUMP.binding}`);
    return;
  }
  const id = String(declared.namespace_id ?? '');
  if (id !== JUMP.productionNamespaceId) {
    fail(
      JUMP.repo,
      `sibling ${JUMP.binding} namespace_id ${id} must be ${JUMP.productionNamespaceId}`,
    );
  }
  if (declared.simple?.limit !== JUMP.limit || declared.simple?.period !== JUMP.period) {
    fail(JUMP.repo, `sibling ${JUMP.binding} must stay ${JUMP.limit}/${JUMP.period}`);
  }
}

function checkRateLimitAllocation(ws, config, byNamespace) {
  const { brand, surface } = parseWorkspace(ws);
  const expectedRegion = regionForSurface(surface);
  if (!expectedRegion) {
    fail(ws, `surface "${surface}" has no rate-limit region in adr/022`);
    return;
  }
  const port = developmentPort(ws, brand, surface);
  if (!port) return;

  const checkLimit = (envName, limit) => {
    const id = String(limit.namespace_id ?? '');
    const where = `${envName} ${limit.name}`;

    if (!isPositiveIntegerString(id)) {
      fail(
        ws,
        `${where} namespace_id ${JSON.stringify(limit.namespace_id)} must be a numeric positive integer string`,
      );
      return;
    }
    if (RETIRED_NAMESPACE_IDS.has(id)) {
      fail(ws, `${where} claims retired historical namespace_id ${id}`);
    }
    if (RESERVED_USA_CORE_NAMESPACE_IDS.has(id)) {
      fail(ws, `${where} claims reserved inactive USA core namespace_id ${id}`);
    }
    if (ENV_PREFIX[envName] === undefined) {
      fail(
        ws,
        `${where} sits in unknown environment ${envName} — adr/022 names production, development, test, vpc, local`,
      );
      return;
    }

    let expected;
    if (limit.name === 'AUTH_RATE_LIMITER') {
      if (surface !== 'core') {
        fail(ws, `${where} is only valid on core`);
        return;
      }
      expected = authRateLimiterNamespace({ env: envName, brand });
    } else if (limit.name === 'RATE_LIMITER') {
      const suffix = regionSuffixOf(id);
      if (suffix === REGION.USA) {
        fail(ws, `${where} uses reserved USA suffix 01 — no USA RATE_LIMITER is configured`);
      }
      if (surface === 'core' && suffix === REGION.GLOBAL) {
        fail(ws, `${where} uses global suffix 00 — core must not`);
      }
      if (GLOBAL_SURFACES.has(surface) && suffix !== REGION.GLOBAL) {
        fail(ws, `${where} is a global surface and must use suffix 00, found ${suffix}`);
      }
      if (surface === 'core' && suffix !== REGION.JAPAN) {
        fail(ws, `${where} is core and currently must use Japan suffix 81, found ${suffix}`);
      }
      expected = rateLimiterNamespace({ env: envName, port, region: expectedRegion });
    } else {
      fail(ws, `${where} is not a known rate-limit binding`);
      return;
    }
    if (id !== expected) {
      fail(ws, `${where} namespace_id ${id} must be ${expected}`);
    }

    const seen = byNamespace.get(id);
    if (seen) {
      fail(
        ws,
        `${where} namespace_id ${id} is already used by ${seen} — each FQDN and environment has its own counter`,
      );
      return;
    }
    byNamespace.set(id, `${ws} ${where}`);
  };

  for (const limit of config.ratelimits ?? []) checkLimit('production', limit);
  for (const [envName, env] of Object.entries(config.env ?? {})) {
    for (const limit of env.ratelimits ?? []) checkLimit(envName, limit);
  }
}

{
  const byNamespace = new Map();
  seedAccountWideNamespaces(byNamespace);
  for (const ws of [
    ...manifest.railsBacked,
    ...(manifest.railsBackedVite ?? []),
    ...(manifest.railsBackedVpcVite ?? []),
    ...manifest.contentSurface,
    ...manifest.standalone,
  ]) {
    const config = loadWrangler(ws);
    if (!config) continue;
    checkRateLimitAllocation(ws, config, byNamespace);
  }
}

if (failures.length > 0) {
  process.stderr.write(`check-workers: FAIL\n${failures.map((line) => `  - ${line}\n`).join('')}`);
  process.exit(1);
}

const checked =
  manifest.railsBacked.length +
  (manifest.railsBackedVite ?? []).length +
  (manifest.railsBackedVpcVite ?? []).length +
  manifest.contentSurface.length +
  manifest.standalone.length;
process.stdout.write(`check-workers: OK (${checked} workers validated)\n`);
