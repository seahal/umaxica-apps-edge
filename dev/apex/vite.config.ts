import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/*
 * Vite is a BUILD tool here and nothing else. Nothing it ships reaches a
 * deployed Worker: `vite build` emits the Worker bundle, the hashed client
 * assets, and an output `wrangler.json` that `wrangler deploy` reads on its
 * own. There is no Vite in the request path and no Node server in production.
 *
 * Two things are deliberately absent from this file.
 *
 * There is no `assets.directory`, here or in wrangler.jsonc: the plugin fills
 * it in with the client build output when it writes the output config.
 * Declaring it in the input config is the documented way to get it wrong.
 *
 * There is no root `index.html`, and none must ever be added. Cloudflare
 * matches static assets BEFORE the Worker runs, so an `index.html` in the
 * build output would answer `/` itself and the Hono route behind it would
 * become unreachable — silently, and only in production.
 *
 * `inspectorPort` is pinned per unit because the root `dev` script runs every
 * unit in parallel; on the plugin's default (9229) they would collide.
 */
export default defineConfig({
  // Source maps for the WORKER build only. `wrangler.jsonc` sets
  // `upload_source_maps`, and the output is `no_bundle`, so wrangler uploads the
  // maps it finds next to the Worker module. The environment is named after the
  // Worker (`name` in wrangler.jsonc, hyphens as underscores). Setting
  // `build.sourcemap` at the root instead would also emit maps into
  // `dist/client`, where they would be served as public static assets.
  environments: { umaxica_apps_edge_dev_apex: { build: { sourcemap: true } } },
  plugins: [cloudflare({ inspectorPort: 9501 }), tailwindcss()],
  server: { allowedHosts: ['umaxica.dev'] },
});
