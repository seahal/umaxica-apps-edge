# ADR 011: The apex workers stay Hono

> Superseded for app/com/org apex only by [ADR 024](024-retire-app-com-org-apex-units.md). The record below is unchanged history.

## Status: Rejected 2026-08-20 — `{app,com,net,org}/apex` remain Hono on Workers

**Do not migrate the apex workers to Astro.** The four units keep Hono, hono/jsx
and the `create-apex-app.ts` composition they have today.

This record exists because the question has now been asked twice. The previous
answer, `adr/004-public-information-surfaces-astro.md`, was rejected on
2026-08-12, but it covered the twelve content frames — `docs`, `news`, `info`,
`help` — and said nothing about the apex layer. Its closing note asked that a
reopening be filed "as a new record, with a new number." This is that record, for
the apex units specifically.

Nothing was built against the proposal. `astro` appears in no `package.json`, no
source file and no config anywhere in the repository, exactly as ADR 004 reported
of itself. There is nothing to undo — only a decision to write down, with the
measurements attached, so the next reader inherits them instead of re-deriving
them.

## Context

The proposal was to move `app/apex`, `com/apex`, `net/apex` and `org/apex` — the
units answering `umaxica.{app,com,net,org}` without a `www` — from Hono to Astro.
Three reasons were offered:

1. Hono on its own makes design work painful.
2. The current implementation is small enough that Astro could clearly carry it.
3. `umaxica.dev` is moving off Vercel onto Cloudflare, so a framework change
   could ride along with an migration that is happening anyway.

The second point is true and is not a reason. Astro could carry this. So could
several other things. What follows is why the exchange is a poor one, in the
shape this repository actually has.

Two matters are deliberately outside this record and are not settled by it: the
`umaxica.dev` Vercel-to-Cloudflare migration, which is wanted and is independent
of the framework question because `dev/apex` is already Hono; and the Tailwind
v4 work, which was in flight when this was written.

## Decision

The apex archetype stays on Hono. The reasoning, in order of weight.

### Astro's three headline strengths all land on empty

Astro is built for content-heavy multi-page sites, for shipping no JavaScript by
default, and for hydrating islands selectively. Measured against these units, all
three find nothing to do.

There is one page. `/about`, rendered by `page-content.tsx` — 77 lines, holding
a Japanese branch and an English branch of the same three paragraphs. There is no
MDX, there are no content collections, and there is no second page to route
between. `net/apex` redirects `/` to `/about`; the other three redirect `/` off
the apex host entirely.

There is already no JavaScript to speak of. Each unit ships 502 B of client
JavaScript, and `.size-limit.json` pins a 560 B budget over it — baseline plus
ten per cent. Astro's floor is not below 502 B, so the zero-JS argument runs the
wrong way here.

There is nothing to hydrate. The actions slot in `shell.tsx` is empty, and says
in a comment why: Search, Preferences, Account and a Menu disclosure belong there
when those surfaces exist, and a control that toggles nothing is worse than no
control. Until they exist there is no island.

### Most of the code is edge middleware for which Astro has no equivalent

Each unit is roughly 997 lines of `src`. About 228 of those are user interface —
`page-content.tsx` at 77, `shell.tsx` at 108, `renderer.tsx` at 43. A framework
migration improves the ergonomics of that quarter.

The other three quarters are `create-apex-app.ts` (130), `health-page.ts` (120),
`brand.ts` (91), `seo.tsx` (87), `security-headers.ts` (58), `csrf.ts` (24),
`structured-logger.ts` (24), `rate-limit.ts` (16 to 21 depending on the unit) and
`i18n/config.ts` (16). This is an edge control layer, not a view layer, and a
large part of it exists only as a thin call into middleware Hono already
provides and tests: `secureHeaders`, `csrf`, `etag`, `languageDetector` and
`timeout`.

Astro offers one middleware hook, `onRequest`, and no equivalents. Migrating
therefore means writing bespoke implementations of Content Security Policy
assembly, CSRF origin matching, ETag generation and language negotiation — in
the security layer, replacing library code that is exercised by every release of
its upstream. The CSRF allowlist in `csrf.ts` is three regular expressions
covering production hosts, `*.localhost` development hosts and `workers.dev`
preview hosts, pinned by `api/csrf.hurl`. Re-deriving it by hand buys nothing and
risks something.

### The Workers-native surfaces do not survive the move intact

`/health`, `/health.html`, `/health.json`, `/revision` and `/offline` are answered
before any page route, and three of them return a `Response` with no view at all.
`/revision` reads `CF_VERSION_METADATA`; the rate limiter reads the `RATE_LIMITER`
binding; `/health.json` stamps `new Date()` on every request. None of that can be
statically generated, so an Astro port is server-rendered by necessity, and these
endpoints become `src/pages/*.ts` files — Astro used purely as a router, doing
what Hono already does with less ceremony.

The realistic destination is Hono mounted inside Astro, or a Worker placed in
front of it to keep the binding-touching paths cheap. That is one framework more
than today, not one fewer.

### The bundle and the delivery path regress against an explicit budget

Beyond the 502 B pin, each `wrangler.jsonc` declares
`assets: { directory: "./public" }`. Cloudflare matches static assets before the
Worker runs, so `/style.css`, the favicon, the manifest and the service worker
cost no invocation and are cached once for every document the unit serves.
`renderer.tsx` records this as the reason the stylesheet is a linked asset rather
than an inline `<style>` with a hand-maintained CSP hash. Preserving that
property under Astro's server-rendered output is deliberate work, and losing it
quietly is the more likely outcome.

### The test estate is the largest hidden cost

Across the four units there are roughly 48 Vitest files carrying about 190 tests
over some 3,150 lines, 36 `.hurl` files over some 2,560 lines, and 8 Playwright
specs.

Two of those three survive a framework change, and it would be dishonest to
imply otherwise. Hurl asserts over HTTP and Playwright asserts in a browser;
neither can tell which framework produced the response, which is precisely the
property the three-layer split in `AGENTS.md` was designed for. They would carry
over essentially untouched, and they are the layers holding the externally
visible contract.

Vitest does not survive. Those suites drive the application through
`app.request()` — a Hono API — so every file that reaches `create-apex-app.ts` is
a rewrite: the error boundaries, the CSRF matcher, the rate limiter, the status
surfaces, the structured logger, the route coverage check. The genuinely
framework-agnostic files, `brand.test.ts` and `seo.test.tsx` among them, would
survive. Compounding this, `vitest.config.ts` sets coverage thresholds of 99 per
cent for lines, statements and functions and 97 per cent for branches. Partial
coverage is a failed build, not a warning, so the rewrite has to land complete.

### The repository's own rules multiply the cost by four

`test/deployment-unit-boundaries.test.ts` forbids cross-unit relative imports,
forbids `workspace:`, `link:` and `file:` protocols between units, forbids a
`tsconfig` that extends outside its own directory, and requires every unit to own
its `vitest.config.ts`, `vitest.setup.ts`, `.oxlintrc.json` and `.oxfmtrc.json`.
The purpose is extractability: a unit that reaches across the boundary cannot be
lifted into its own repository.

The consequence for this proposal is that there is nowhere shared to put an Astro
configuration. It is the same rule that produced twenty-one `@theme` blocks
rather than one Tailwind preset, as `docs/design/ui-shell-contract.md` §2
explains. So this is not one migration; it is four, run in parallel, with every
config, adapter and integration copied four times and no preset permitted to hold
them together.

It also changes the dependency posture sharply. The apex units declare two
runtime dependencies today — `hono` and `@hono/structured-logger`. Astro brings a
Vite and Rollup tree into units of that size, against a 21-job Knip matrix
running with `--treat-config-hints-as-errors`, a syncpack-enforced `catalog:`
that pins every version repository-wide, and a 21-job build matrix that runs
`check:size` immediately after each build.

### ADR 004's central reason transfers directly

ADR 004 was closed because the frames "converged rather than diverged", and
splitting some of them onto a second framework would have broken a byte-identity
pin "in exchange for benefits nobody had measured."

That is the apex situation exactly. The four units are the same implementation
four times over, differing only in TLD literals, canonical host strings, the
`service` name, KV namespace ids and rate-limit namespace ids. `net/apex` alone
lacks `root-redirect.ts`, because it renders a page where the others redirect
away. Introducing a second framework into that set costs the convergence and
returns a benefit that, before this record, nobody had measured either.

### The stated motivation has already been addressed

"Hono alone makes design painful" was true of a state that no longer exists. The
Tailwind v4 work landed across the estate, and the apex shell and page content
are already ordinary utility-class markup. The `@theme` blocks already carry the
Japanese typography this project needs — `word-break: auto-phrase` and
`text-wrap: balance` on headings, `text-spacing-trim` and `text-autospace` at the
root, a Noto Sans JP-led system stack with no web font — alongside a single
`--breakpoint-wide` and `--color-brand` as the one colour pinned by literal
value.

Whatever design difficulty remains after that is worth naming precisely before
choosing a tool for it, because Astro answers only some of the things the phrase
could mean, and the cheaper answers were not tried.

### Escaping Vercel does not require Astro

The third motivation dissolves on inspection. `dev/apex` is already a Hono
application — `src/app.ts`, 217 lines. What ties it to Vercel is two files:
`api/index.ts`, which wraps the app in `hono/vercel`'s `handle` and declares the
edge runtime, and `vercel.json`, whose only content is a catch-all rewrite to
that entry point.

Reshaping it after `net/apex` is therefore a copy from a working sibling rather
than a port, and it would close two exceptions that are currently documented as
deviations: `dev/apex` is excluded from the `test-api` CI matrix because
`vercel dev` blocks on interactive device authentication, and from `check:size`
because it ships no browser JavaScript and so carries no `.size-limit.json`.
Introducing Astro adds work to that migration; it removes none.

## Two incompatibilities worth recording

Both are easy to miss early and expensive to discover late, so they are written
down here rather than left to be rediscovered.

**`<html lang>` is pinned to `defaultLocale` and is independent of the negotiated
locale.** Every document these units emit declares `lang="ja"`, including the
ones whose copy is English. This is deliberate: the `word-break: auto-phrase`
rule must apply to Japanese text and must not apply to English, and the `lang`
attribute is what selects it. `api/i18n.hurl` pins the behaviour at its first and
last steps. Astro's i18n routing assumes the routed locale and the document
language agree, which is the opposite premise.

**The Content Security Policy forbids inline script and inline style outright.**
`security-headers.ts` sets `script-src 'self'`, `script-src-attr 'none'`,
`style-src 'self'` and `style-src-attr 'none'`. This is why every visual rule is
a Tailwind class and why the status-page class strings in `create-apex-app.ts`
are whole constant literals — Tailwind scans that file as plain text, so a class
name assembled at runtime would never be generated. Any island strategy has to be
reconciled with that policy rather than assuming a nonce or an inline bootstrap
is available.

## When to reopen this

This is not a permanent ban on Astro, and the arguments above are contingent on
facts that could change. Reopen the question — as a new record, with a new
number — when either of the following becomes true:

- **The apex units become a genuine multi-page content surface.** If they grow
  real navigation, authored articles or a marketing site, then content
  collections, MDX, layouts and slots, image optimisation and a sitemap
  integration in place of the hand-maintained `public/sitemap.xml` are real
  answers that hono/jsx does not have. Today they answer a question nobody is
  asking of a single `/about` page.
- **The twelve content frames are reconsidered.** ADR 004 kept them on Next.js.
  If that is revisited and a single framework across the estate becomes the
  point, then the apex layer should be decided as part of that, not separately.
  Moving four units alone buys none of the consistency that would justify it.

What would not justify reopening: that Astro could do this. It could. So can what
is already deployed.

## Consequences

- `{app,com,net,org}/apex` keep Hono, hono/jsx and `create-apex-app.ts`. The
  archetype in `docs/design/ui-shell-contract.md` §1 is unchanged.
- Design work on the apex units continues through Tailwind utilities and the
  per-unit `@theme`, under the rules in §3a of that contract.
- `dev/apex` may move from Vercel to Cloudflare Workers on its own schedule. It
  stays Hono either way, so that migration is unblocked by this record and
  unaffected by it.
- Astro remains absent from the repository. No `package.json`, no `catalog:`
  entry, no config.

## Outcome

**Rejected, 2026-08-20, without being implemented.** The four apex workers stay
Hono.

The decision was taken after reading the units rather than from first
principles, and the numbers in this record — 502 B of client JavaScript against a
560 B budget, 228 view lines out of 997, roughly 3,150 lines of Hono-driven
Vitest behind a 99 per cent coverage threshold, two runtime dependencies per unit
— are the measurement ADR 004 observed had never been taken. They are recorded
here so that a future reopening starts from them.

No file outside this directory was changed. `adr/004-public-information-surfaces-astro.md`
was deliberately left alone: it is a closed record about a different set of
units, and its own header warns against rewriting closed records.
