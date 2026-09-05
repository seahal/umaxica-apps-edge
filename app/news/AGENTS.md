# This unit is Astro on Vite

`app/news` builds with Astro (`output: 'static'`) and `@astrojs/cloudflare` and
runs on workerd. The three Cores stay on TanStack Start; the five apex workers
stay on Hono. `adr/015-public-content-surfaces-astro.md` is the decision record.

## What is load-bearing here

- **`src/` is the Astro `srcDir`.** Pages live in `src/pages`. There is no
  TanStack router and no `routeTree.gen.ts`.
- **`/` negotiates language** (`Accept-Language` → 302 to `/ja/` or `/en/`).
  Content pages are under `/[lang]/`.
- **`output: 'static'`.** Only `/` and `/health` (and `/revision`, `/api/v0/revision.json`) are
  on-demand (`prerender = false`). Everything else is a file on the asset layer.
- **Security headers live in `public/_headers`.** No per-request nonce: scripts
  and styles are same-origin files (`script-src 'self'` / `style-src 'self'`).
- **`remoteBindings` is false unless `CLOUDFLARE_ENV=vpc`.** A Workers VPC
  Service has no local simulator.
- **Region is `PUBLIC_REGION` at build time.** Language is a URL prefix.

Deploy scripts still exist on the package but are not the work of this cut —
`pnpm run build` is `astro build`.
