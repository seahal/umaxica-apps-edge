# Plan 003: Migrate `com/apex`, `org/apex`, `net/apex` to Direct Route Composition

> Superseded for app/com/org apex only by [ADR 024](024-retire-app-com-org-apex-units.md). The record below is unchanged history.

## Status: Completed

## GitHub Issue

https://github.com/seahal/umaxica-apps-edge/issues/249

## Problem

`com/apex`, `org/apex`, and `net/apex` all instantiate their Hono apps through the `createApexApp()` factory defined in `shared/apex/create-apex-app.tsx`. This factory obscures the middleware and route composition behind a configuration object, making the apps harder to reason about and diverging from how idiomatic Hono apps are structured.

`app/apex` was already migrated to direct composition (explicit `app.use(...)` / `app.route(...)` calls). The remaining three workspaces should follow the same pattern.

## Approach

Each workspace replaces its `createApexApp(config)` call with a manually composed Hono app, identical in structure to `app/apex/src/app.tsx`. The individual route factories and middleware from `shared/apex` are still used — only the outer `createApexApp` wrapper is removed.

### Template (based on `app/apex/src/app.tsx`)

```ts
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import {
  etagMiddleware, rateLimitMiddleware, apexCsrfMiddleware,
  securityHeadersMiddleware, i18nMiddleware,
} from '../../../shared/apex/middleware'
import {
  createHealthRoute, createAboutRoute, createRootRoute, handleHealthError,
} from '../../../shared/apex/routes'
import { createNotFoundFallback } from '../../../shared/apex/html/fallback-pages'
import { createRootRedirect } from '../../../shared/apex/root-redirect'
import type { ApexBindings } from '../../../shared/apex/create-apex-app'

const { resolveRedirectUrl, getDefaultRedirectUrl, buildRegionErrorPayload } =
  createRootRedirect('umaxica.com') // adjust per domain

const app = new Hono<ApexBindings>()

app.use(etagMiddleware())
app.use(rateLimitMiddleware())
app.use('*', apexCsrfMiddleware())
app.use('*', securityHeadersMiddleware())
app.use(i18nMiddleware())

app.route('/', createHealthRoute())
app.route('/', createRootRoute('redirect', renderer, { resolveRedirectUrl, getDefaultRedirectUrl, buildRegionErrorPayload }))
app.route('/', createAboutRoute(renderer, { getAboutMeta, renderAboutContent }))

app.onError(async (err, c) => { ... })
app.notFound((c) => createNotFoundFallback(c))

export default app
```

### Per-Workspace Notes

| Workspace  | Root Handler | Domain        |
| ---------- | ------------ | ------------- |
| `com/apex` | `redirect`   | `umaxica.com` |
| `org/apex` | `redirect`   | `umaxica.org` |
| `net/apex` | `page`       | `umaxica.net` |

`net/apex` uses `rootHandler: 'page'` so it uses `createRootRoute('page', ...)` with `getRootMeta` and `renderRootContent` instead of the redirect config.

### `createApexApp` Deprecation

After migration, `createApexApp` will have no callers. Add a `@deprecated` JSDoc comment to the function and a note that it will be removed in a future cleanup. Do not delete it yet — that is a separate task.

## Files to Change

| File                              | Change                                                  |
| --------------------------------- | ------------------------------------------------------- |
| `com/apex/src/index.tsx`          | Replace `createApexApp(config)` with direct composition |
| `org/apex/src/index.tsx`          | Replace `createApexApp(config)` with direct composition |
| `net/apex/src/app.tsx`            | Replace `createApexApp(config)` with direct composition |
| `shared/apex/create-apex-app.tsx` | Add `@deprecated` JSDoc to `createApexApp`              |

## Tests

Existing apex tests (in `shared/apex/__tests__/create-apex-app.test.ts`) test the factory itself — those remain valid. No additional tests are required for this migration since the behaviour is identical; the goal is structural, not behavioural.

If per-workspace smoke tests exist, verify they still pass after migration.

## Notes

- `net/apex` does not use `createRootRedirect`; it uses `getRootMeta` / `renderRootContent` directly — follow the `rootHandler: 'page'` branch from the existing factory.
- Do not remove OpenTelemetry instrumentation from `app/apex` — it already wraps with `instrument()` in `index.tsx`, not in `app.tsx`. The other workspaces use Sentry wrapping; keep that in place.
- Sentry in `com/apex` is currently commented out with a note to re-enable. Keep the comment.

---

## Outcome

**Implemented and merged.** All three apex workspaces migrated successfully.

### Changes Made

- `com/apex/src/index.tsx` — Replaced `createApexApp(config)` with direct Hono app composition (`createRootRedirect('umaxica.com')` + explicit middleware + route mounts)
- `org/apex/src/index.tsx` — Same pattern for `umaxica.org`
- `net/apex/src/app.tsx` — Same pattern using `createRootRoute('page', ...)` for the page handler variant
- `shared/apex/create-apex-app.tsx` — Added `@deprecated` JSDoc to `createApexApp`

### Verification

- `vp check`: ✅ 459 files formatted, 204 files lint/type clean
- `vp test`: ✅ 363 tests passed (57 test files), no regressions

> Superseded: Vite+ (`vp`) has since been removed. The equivalent commands are
> now `pnpm run check` and `pnpm run test`. Retained above as a historical record.

### Closes

https://github.com/seahal/umaxica-apps-edge/issues/249

---

## Addendum (2026-08-10)

The plan and outcome above are kept as the historical record. Two things have
changed since; read this section, not the sections above, for current state.

### File layout

`shared/apex/` no longer exists. Per the "no shared directory" rule in
`CLAUDE.md`, each frame owns its own copy of the apex scaffolding:

| Then (above)                         | Now                                            |
| ------------------------------------ | ---------------------------------------------- |
| `net/apex/src/app.tsx`               | `net/apex/src/index.tsx`                       |
| `shared/apex/create-apex-app.tsx`    | `<frame>/apex/src/create-apex-app.ts`          |
| `shared/apex/root-redirect.ts`       | `<frame>/apex/src/root-redirect.ts`            |
| `shared/apex/middleware`, `…/routes` | inlined into each frame's `create-apex-app.ts` |

`createApexApp` was not deprecated and removed as planned — it came back as a
per-frame local factory (`createApexApp(configurePageRoutes, { service })`),
which is what every `*/apex/src/index.tsx` calls today. The `vp` commands in
the Verification section are also obsolete; use the pnpm scripts in `CLAUDE.md`.

The root-handler table in "Per-Workspace Notes" is still accurate:
`com`/`org`/`app` redirect to `https://jp.<their own TLD>/` via their local
`root-redirect.ts`, and `net/apex` renders a page — its `/` is a same-origin
`301` to `/about` (`net/apex/src/index.tsx:8`) and it has no `root-redirect.ts`.

### Apex domain binding is declared in `wrangler.jsonc`

Each `*/apex/wrangler.jsonc` declares its hostname as a top-level `routes`
entry with `custom_domain: true`. That declaration is the single source of
truth, and `wrangler deploy` reconciles it.

Do not add, move, or remove apex domains in the Cloudflare dashboard. This was
added in response to a real incident: `umaxica.net` had been bound to
`umaxica-apps-edge-apex-app` in the dashboard, so it served the app frame's
pages and redirected `/` to `https://jp.umaxica.app/`. Because nothing in the
repo declared domain bindings, the drift was invisible to code review and to
every reachability check — the wrong Worker still answered `200`.

Two consequences worth knowing:

- Named environments **inherit** top-level `routes`. Without an explicit
  `"routes": []` in `env.development` and `env.test`, an `--env development`
  deploy reassigns the production custom domain to `<name>-development`. Each
  apex config sets that empty array; do not remove it.
- `scripts/check-apex-domains` verifies the binding by reading the `service`
  field of each host's `/health.json`. See
  `docs/operations/connectivity-acceptance.md`.
