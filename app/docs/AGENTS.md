# This unit is Astro on Vite

`app/docs` builds with Astro (`output: 'static'`) and `@astrojs/cloudflare` and
runs on workerd. The three Cores stay on TanStack Start; the five apex workers
stay on Hono. `adr/015-public-content-surfaces-astro.md` is the decision record.

## What is load-bearing here

- **`src/` is the Astro `srcDir`.** Pages live in `src/pages`. There is no
  TanStack router and no `routeTree.gen.ts`.
- **`/` negotiates language** (`Accept-Language` → 302 to `/ja/` or `/en/`).
  Content pages are under `/[lang]/`.
- **`output: 'static'`.** `/`, `/health`, `/health/*` probes, `/revision`, `/api/v0/revision.json`, and the CMS document route
  `/[lang]/[slug]` are on-demand (`prerender = false`). The fixed shell pages remain
  files on the asset layer.
- **Security headers live in `public/_headers`.** No per-request nonce: scripts
  and styles are same-origin files (`script-src 'self'` / `style-src 'self'`).
- **`remoteBindings` is false unless `CLOUDFLARE_ENV=vpc`.** A Workers VPC
  Service has no local simulator. `cms_bootstrap` is a deployed-only temporary tier
  that binds the existing development service without `remote: true`; it carries no
  production traffic and proves no production Rails connectivity.
- **Region is `PUBLIC_REGION` at build time.** Language is a URL prefix.

CMS pages resolve `cloudflare:workers` bindings through `src/lib/env.ts`, then call the
fixed Rails origin through `src/lib/cms/`. They accept only the pilot `body.text`
consumer contract, render it as plain text, and return `Cache-Control: no-store`.
The transport uses a 5000 ms deadline, no retry, manual redirects, and a 1 MiB body
limit. CMS failures are generic HTML responses; closed structured log fields carry
the internal classification without URLs, slugs, headers, bodies, or exception text.

Deploy scripts still exist on the package but are not the work of this cut —
`pnpm run build` is `astro build`.
