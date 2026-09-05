import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/*
 * Vite is a BUILD tool here and nothing else, exactly as in the apex Workers
 * (adr/012-apex-vite-build-and-static-assets.md). `vite build` emits the Worker
 * bundle, the hashed client assets, and an output `wrangler.json` that
 * `wrangler deploy` reads on its own. There is no Vite in the request path and
 * no Node server in production.
 *
 * Three things are deliberately absent.
 *
 * There is no `assets.directory`, here or in wrangler.jsonc: the plugin fills it
 * in with the client build output when it writes the output config. Declaring it
 * in the input config is the documented way to get it wrong.
 *
 * There is no root `index.html`. Cloudflare matches static assets BEFORE the
 * Worker runs, so an `index.html` in the build output would answer `/` itself
 * and the route behind it would become unreachable — silently, and only in
 * production.
 *
 * There is no `prerender`. Every HTML route is server-rendered per request, so
 * the security headers and the rate limiter in `src/server.ts` apply to all of
 * them from one place. Prerendering three pages would move them behind the
 * asset matcher, where neither runs, and would additionally read local bindings
 * at build time.
 *
 * `inspectorPort` is pinned per unit because the root `dev` script runs every
 * unit in parallel; on the plugin's default (9229) they would collide.
 * `viteEnvironment: { name: 'ssr' }` is what the Cloudflare framework guide
 * requires so TanStack Start's server build targets the Worker environment.
 */
/*
 * The two flags that select the direct Rails transport in
 * `src/lib/rails-client.ts`, bridged from the shell into the Worker.
 *
 * `vite dev` runs the Worker in workerd, whose `process.env` is built from the
 * Worker's own vars and NOT from the shell — so `EDGE_LOCAL_NODE_RUNTIME=1` in
 * the dev script and `EDGE_LOCAL_RAILS_ENABLED` from the container-wide Rails
 * overlay do not reach it on their own. Measured 2026-08-22: with
 * both exported, `/health` still reported `not-configured`, meaning the local
 * branch was never taken.
 *
 * This config file runs in Node, where the shell environment IS visible, so it
 * is the one place that can carry them across. Only names that are already set
 * are forwarded, so an unset overlay stays unset and the client keeps failing
 * closed to `not-configured` rather than being handed a transport it was not
 * granted.
 *
 * **The forwarding happens only while SERVING, never while building**, and that
 * guard is load-bearing rather than tidiness. `compose.yaml` exports
 * `EDGE_LOCAL_RAILS_ENABLED` container-wide, so without it a `pnpm run build`
 * run inside the development container baked both flags into the production
 * artefact — measured 2026-08-22, they appeared in `dist/server/wrangler.json`
 * under `vars`. A deployed production Worker carrying them would take the direct
 * transport to a `.localhost` origin instead of the VPC binding, and answer
 * `unreachable` forever rather than reaching Rails.
 */
const LOCAL_RAILS_FLAGS = ['EDGE_LOCAL_NODE_RUNTIME', 'EDGE_LOCAL_RAILS_ENABLED'] as const;

// Mutated in place rather than returned as a new object: the plugin MERGES what
// the customizer returns into the config it passed in, so `{ ...config }` comes
// back with `compatibility_flags` concatenated onto itself and workerd refuses to
// start — "Compatibility flag specified multiple times: nodejs_compat".
function forwardLocalRailsFlags(config: { vars?: Record<string, unknown> }): void {
  for (const name of LOCAL_RAILS_FLAGS) {
    const value = process.env[name];
    if (value === undefined) continue;
    config.vars = { ...config.vars, [name]: value };
  }
}

/*
 * `remoteBindings` is load-bearing, not a default being restated.
 *
 * The plugin defaults it to TRUE. A Workers VPC Service has no local simulator,
 * so with the default, any command that resolves a configuration declaring
 * `vpc_services` opens a remote proxy session against Cloudflare — and that
 * session cannot be authenticated with an API token, only with an interactive
 * `wrangler login`. This Worker declares the binding at the top level (which IS
 * production) and in `env.development` and `env.vpc`, so `vite preview` — which
 * reads the built production config — failed outright without credentials:
 *
 *   In a non-interactive environment, it's necessary to set a
 *   CLOUDFLARE_API_TOKEN environment variable for wrangler to work
 *
 * Measured 2026-08-22.
 *
 * `env.vpc` is the one tier whose entire purpose is the real remote binding, so
 * it is the one tier that opts back in — and `pnpm dev:vpc` is documented as
 * needing `wrangler login`. Everything else, including CI, stays credential-free.
 */
const wantsRemoteBindings = process.env['CLOUDFLARE_ENV'] === 'vpc';

export default defineConfig(({ command }) => ({
  // The core's pages and components import through `@/`, declared in its own
  // tsconfig. Vite resolves it from there rather than from a second list here.
  resolve: { tsconfigPaths: true },
  // The Cloudflare Tunnel forwards the browser's Host unchanged, so `vite dev`
  // sees the public hostname and refuses it: Vite allowlists Hosts to block DNS
  // rebinding against a dev server. Only this unit's own two tunnel hostnames are
  // listed — never `true` and never a wildcard, which would give that defence
  // up. `server` is read while serving only, so `vite build` is unaffected.
  server: { allowedHosts: ['jp.umaxica.app', 'us.umaxica.app'] },
  plugins: [
    tailwindcss(),
    cloudflare({
      inspectorPort: 9405,
      viteEnvironment: { name: 'ssr' },
      remoteBindings: wantsRemoteBindings,
      ...(command === 'serve' ? { config: forwardLocalRailsFlags } : {}),
    }),
    tanstackStart(),
    viteReact(),
  ],
}));
