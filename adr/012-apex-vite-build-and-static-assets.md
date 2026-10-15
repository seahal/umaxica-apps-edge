# ADR 012: The apex workers build through Vite, and the NET series owns its root

> Superseded for app/com/org apex only by [ADR 024](024-retire-app-com-org-apex-units.md). The record below is unchanged history.

## Status: Implemented 2026-08-19

Five units — `{app,com,dev,net,org}/apex` — build with Vite and
`@cloudflare/vite-plugin`. `dev/apex` moved from Vercel to Cloudflare Workers,
`dev/acme` was deleted, and the NET-series apexes answer `/` with a page instead
of a redirect.

**The line Vite sits on is build time versus run time, not development versus
production.** `vite build` produces the **production** artefact — the deployed
Worker bundle and the hashed assets — as well as backing `vite dev` locally. It
is CI's build step and cannot be dropped from it. What Vite never does is run in
production: nothing it installs reaches the deployed Worker, and production
starts no Node process and no server.

This distinction is stated here because it is easy to read "build tool" as
"development-only tool" and conclude that CI does not need Vite. It does; a
build is how the production artefact exists at all.

This record supersedes `adr/002-dev-apex-vercel.md`. It does not touch it: that
is a closed record, and `adr/README.md` is explicit about not rewriting those.

## Context

Four apex Workers ran Hono on Cloudflare with `assets: { directory: "./public" }`
and compiled CSS with `@tailwindcss/cli` into `public/style.css`. `dev/apex` ran
Hono on Vercel with a different implementation. `dev/acme` ran Next.js on Vercel
at `www.umaxica.dev`.

The brief that produced this work asked for four things: keep Hono, use Vite as
a build tool, move static assets to Cloudflare, and shrink runtime dependencies.
**Two of the four were already true**, and saying so is the first decision here,
because the remaining work is different from the work that was asked for.

- Static assets were already served by Cloudflare. The `assets` key was present
  in all four `wrangler.jsonc`, no `binding` was declared, and `serveStatic`
  appeared nowhere in the repository. Hono was already not an asset server.
- Runtime dependencies were already two per unit: `hono` and
  `@hono/structured-logger`. The only reduction available was to reimplement the
  logger, which trades a dependency for code that then has to be maintained and
  tested here.

So Vite could not be justified as dependency reduction. It had to be justified
on its own or not adopted.

---

## Decision 1 — Vite builds the apex Workers

**Decision.** `{app,com,dev,net,org}/apex` build with `vite build` and
`@cloudflare/vite-plugin`. `vite dev` replaces `wrangler dev`. Vite,
`@cloudflare/vite-plugin` and `@tailwindcss/vite` are devDependencies in every
unit; `dependencies` stays at `hono` and `@hono/structured-logger`.

`vite build` is the **production** build — `deploy`, `deploy:upload`,
`upload:ci` and `deploy:ci` all run it first, and `wrangler deploy` then uploads
what it produced. Vite being a devDependency describes _when_ it runs, not
_which environment it builds for_: it is absent from the running Worker, not
from the release path. The three lines below are only intelligible under that
reading — a dev-only tool would have no `CLOUDFLARE_ENV` production hazard, no
output `wrangler.json` for `wrangler deploy` to read, and no dead-code
elimination of the dev branch in `src/assets.ts`.

**Evidence.** Cloudflare serves static assets with
`Cache-Control: public, max-age=0, must-revalidate` unless told otherwise, and
documents `immutable` as opt-in through `_headers` **for fingerprinted assets
specifically** ([Workers static assets — headers][cf-headers]). `public/style.css`
had no content hash, so it could not take that header, and `_headers` carried no
rule for it. Every document these units served revalidated 8,327 bytes of CSS.

Vite emits the stylesheet as `/assets/style-<hash>.css`, which `_headers` now
marks `max-age=31536000, immutable`. The CSP is `style-src 'self'` with no hash
([`security-headers.ts`]), so a changed filename changes nothing about it.

Two measurements taken before and after, on `net/apex`:

|                         | before    | after     |
| ----------------------- | --------- | --------- |
| Worker bundle, raw      | 201,068 B | 166,391 B |
| Worker bundle, gzip     | 47,015 B  | 43,021 B  |
| Client JavaScript, gzip | 502 B     | 502 B     |

The bundle shrank because Rolldown replaces wrangler's own esbuild pass. That
was not a goal and is not load-bearing; it is recorded so nobody has to re-derive
it.

**Why.** The immutable stylesheet is the return. Everything else Vite brings
here — a dev server, HMR — is incidental to units with one page and 502 bytes of
client JavaScript.

**Rejected alternatives.**

- _Hash the filename in the existing `build:css` script._ This gets the same
  cache win in about five lines with no new dependency, and it remains the
  cheaper answer if the Vite tree ever becomes a problem. Rejected because the
  five lines are a bespoke asset pipeline that then has to grow a manifest the
  moment a second asset needs hashing, and because `@tailwindcss/vite` is the
  supported path for the same engine the sixteen Next frames already use through
  `@tailwindcss/postcss`.
- _`@hono/vite-build`._ Still published, but Hono's own Cloudflare guide is
  built on `@cloudflare/vite-plugin` and calls it "the recommended way to start a
  new full-stack project on Cloudflare" ([Hono — Cloudflare Workers + Vite][hono-vite]).
- _Leave the four Workers alone and change only `dev/apex`._ Rejected: the five
  units are one implementation differing by TLD literals, and ADR 011 turned on
  keeping them converged.

**Consequences.**

- Build supply-chain surface **increased**. This is the honest cost and it is
  the opposite of what the brief listed under "reduce dependencies": a Vite and
  Rolldown tree now exists in five units that previously had no bundler at all.
  ADR 011 counted exactly this against Astro. It is accepted here because it
  buys a measured cache property rather than an ergonomic one, and because
  nothing it installs reaches a Worker: the built bundle contains no `vite`,
  `wrangler`, `vitest`, `oxlint`, `playwright` or `happy-dom` string, and emits
  no source map.
- `wrangler.jsonc` no longer declares `assets.directory`. The plugin writes an
  **output** `wrangler.json` into the build with `directory` pointing at the
  client output, and `wrangler deploy` reads that ([Vite plugin — static
  assets][cf-vite-assets]). Passing `--config` to `deploy` would defeat this and
  is removed from every script.
- `CLOUDFLARE_ENV= vite build` — the blank is load-bearing. The plugin honours
  `CLOUDFLARE_ENV` at build time and `compose.yaml` exports `development`, so
  without it the artefact is named `…-development`, carries development vars and
  binds the development rate-limit namespace. This is the same hazard ADR 006
  recorded for `wrangler deploy`, arriving one command earlier.
- `src/assets.ts` appends `?direct` under `import.meta.env.DEV`. Vite serves CSS
  as a JavaScript module in dev, so a `<link rel="stylesheet">` at the module URL
  arrives as `text/javascript` and does not apply. The e2e suite asserts a
  computed background colour to catch that, because every status code stays 200
  when it happens.

## Decision 2 — assets stay asset-first; `run_worker_first` is not set

**Decision.** No apex Worker sets `run_worker_first`. Both `html_handling` and
`not_found_handling` are pinned to `"none"`.

**Evidence.** Static asset requests are free and unmetered, and
`run_worker_first` makes every matching request invoke the Worker — billed, and
returning 429 rather than the asset when limits are hit ([billing and
limitations][cf-billing]). Assets are matched before the Worker by default, so
`/` reaches Hono simply because no asset is named `/`.

**Why `"none"`.** It is a guard, not a behaviour change: these units ship no
HTML assets, so nothing changes today. But an `index.html` appearing in the
build output would be served **in place of** the Hono route at `/`, and would do
it silently — no error, no failing status, just the wrong document. `"none"`
means that cannot happen even if someone adds a root `index.html` later.

**Consequences.** Static assets continue to cost no invocation. The COM-series
region redirect and the NET-series homepage are both reached by the Worker.

## Decision 3 — the NET series answers `/`

**Decision.** `net/apex` and `dev/apex` return 200 and a homepage at `/`.
`net/apex` previously redirected `/` → `/about` (301); `dev/apex` previously
redirected `/` → `https://www.umaxica.dev/` (301). `/about` survives in both,
with its own canonical URL.

**Why.** These are domains, not redirectors. A domain whose root forwards has no
canonical page of its own, and in `dev/apex`'s case forwarded to an application
that this change deletes.

**Consequences.** `dev/apex`'s old redirect and the new `www` rule would form a
loop, which fixes the deployment order — see Decision 5.

## Decision 4 — COM redirects stay in Hono; NET `www` moves to Cloudflare Rules

**Decision.** This is the responsibility contract, and it is the one thing in
this record that must not be blurred later:

```text
www.umaxica.{net,dev} → apex    =  Cloudflare Redirect Rules
umaxica.{app,com,org}/ → region =  Hono
```

**Why.** They are different kinds of thing. `www` → apex depends on nothing but
the hostname; answering it in a Worker bills an invocation for a question the
edge already knows. The COM-series `/` reads `?ri=`, matches it case-insensitively
against a closed two-entry allowlist, defaults to `jp` for anything unrecognised,
and is covered by a ten-case open-redirect table in
`test/root-redirect.test.ts` plus assertions in `api/routes.hurl`. A redirect
rule cannot express that, and moving it into a dashboard would move a
security-relevant allowlist out of code review and out of the test suite.

**Consequences.** The COM contract is unchanged by this work —
`src/root-redirect.ts` and `src/index.tsx` are byte-identical to their previous
state in all three units, and the Hurl suites pass unmodified except for one
stylesheet assertion.

## Decision 5 — `dev/apex` runs on Workers; `dev/acme` is deleted

**Decision.** `dev/apex` deploys to Cloudflare Workers on the shared apex
archetype. `dev/acme` — Next.js on Vercel at `www.umaxica.dev` — is removed
entirely, with the `vercel` and `@sentry/*` toolchain it was the last consumer
of.

**Evidence.** `dev/apex` was not a sibling of the other four. It was a separate
217-line implementation with **no** CSP, secure headers, CSRF allowlist, rate
limiting, ETag, structured logging, `/revision`, `/offline`, service worker,
`robots.txt`, `sitemap.xml`, `manifest.webmanifest` or HTTP-contract suite.

**Why.** The migration is therefore mostly a security change, not a hosting
change. It also closes two documented CI exceptions: `dev/apex` was excluded
from the `test-api` matrix because `vercel dev` blocks on interactive device
authentication, and had no `check:size` budget. `vite dev` starts
non-interactively, so the unit now carries nine `.hurl` files and a 560 B budget
like its siblings.

**Consequences.**

- `/health.json` reports `edge: "cloudflare"`, reads `CF_VERSION_METADATA`
  instead of `VERCEL_GIT_COMMIT_SHA`, and gains `environment` — six keys, like
  every other apex.
- `<html lang>` is pinned to `defaultLocale`, now `ja`. Copy is still negotiated
  per request; only the attribute is fixed, because it selects
  `word-break: auto-phrase`, which must apply to Japanese and not to English.
  This matches the incompatibility ADR 011 recorded.
- The CSRF allowlist gained the `dev` TLD in all five units, keeping them
  converged rather than letting one diverge.
- **`umaxica.dev` is still delegated to Vercel DNS.** Deleting the application
  did not move the zone. Until it is on Cloudflare nameservers the Worker has no
  custom domain and the `www` rule cannot exist. This is the largest piece of
  remaining work and it is not in this repository —
  `docs/operations/net-www-canonicalisation.md` records it.

## What is deliberately NOT changed

- **Hono stays**, in all five units, per ADR 011. No SPA framework was added;
  adopting Vite is not adopting a client framework, and these units still ship
  502 bytes of client JavaScript against a 560 byte budget.
- **The CSP is unchanged**, including `style-src 'self'` with no hash.
- **The COM-series redirect contract is unchanged**, including the discarded
  query string. `?ri=us&a=1` still yields `https://us.umaxica.com/`.
- **`@tailwindcss/cli` remains catalogued** but has no consumer. It is the only
  Tailwind front end that needs no bundler; the entry should be deleted if
  nothing reclaims it.

## Outcome

**Implemented, 2026-08-19.** All twenty units pass `check:static`; the five apex
units pass 9/9 Hurl files each; the root invariant suite passes 428 tests;
`check-workers` validates twenty Workers.

**Follow-up, 2026-08-25.** Nothing reclaimed `@tailwindcss/cli`, so the catalog
entry named above was deleted. All twenty units run the engine through
`@tailwindcss/vite`. Its `allowBuilds` companion went with it: `@parcel/watcher`
was reachable only through the CLI's `--watch` mode, and with no consumer for
the CLI it appears nowhere in the lockfile — the entry declined a build script
for a package that was never in the tree.

Two pre-existing conditions were found and deliberately **not** fixed here,
because both predate this work and neither is caused by it:

- `pnpm test:cov` already failed its own 99% thresholds on `net/apex`
  (90.19% statements) before any change in this record. Verified by running
  coverage against the unmodified tree.
- `net/apex` keyed its rate limiter on `<first-path-segment>:<ip>`, which let a
  caller multiply their budget by varying the path. That one _was_ fixed, since
  copying `net/apex` to `dev/apex` would have propagated it.

[cf-headers]: https://developers.cloudflare.com/workers/static-assets/headers/
[cf-billing]: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
[cf-vite-assets]: https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/
[hono-vite]: https://hono.dev/docs/getting-started/cloudflare-workers-vite
[`security-headers.ts`]: ../net/apex/src/security-headers.ts
