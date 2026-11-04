# ADR 026: TanStack Start is stable; its catalog range is `^`

## Status: Implemented 2026-10-14

## Context

`adr/013-frames-tanstack-start.md` made TanStack Start a CONDITIONAL GO with
four constraints. Constraint 3 — "Pin TanStack minors and read the changelog" —
rested on one fact: Start was at Release Candidate, and the framework moved
from 1.168 to 1.171 within one session. The catalog in `pnpm-workspace.yaml`
pinned both packages with `~` for the same reason.

TanStack declared Start stable on 2026-10-13
(<https://tanstack.com/blog/tanstack-start-1-0>). On npm, the stable cut is
`@tanstack/react-start@1.169.0`; the version line was already 1.x during the RC,
so there is no `1.0.0`. The announcement commits to the APIs but states no
semver policy. 1.169.0 was itself a minor that removed APIs, so the RC-to-stable
transition was not semver-clean.

ADR 013 rewrites nothing, so this record amends it instead.

## Decision

1. **Start and Router move to `^1.169.1` / `^1.170.44`** in the catalog. Minor
   releases flow in on the next resolution. This replaces constraint 3 of ADR 013. Reading the changelog when the lockfile moves a minor is still expected;
   it is no longer enforced by the range.
2. **One Router, enforced.** Start depends on one exact Router release (a
   `dependency`, not a peer range). With both on `^`, a Router published ahead
   of Start can resolve as a second copy beside Start's. That fails silently, so
   `test/tanstack-router-single-version.test.ts` reads `pnpm-lock.yaml` and
   requires exactly one resolved `@tanstack/react-router` and one
   `@tanstack/react-start`.
3. **The twelve Publishing cells export a plain `{ fetch }` entry**, not
   `createServerEntry({ fetch })`. In 1.169, `createServerEntry` answers a path
   with invalid percent-encoding (`/%E0%A4%A`) with a bare 400 before calling
   `fetch`. That 400 skipped `src/request-handler.ts`, so it left with no
   security headers, no `X-Request-Id` and no completion log. On 1.168.60 the
   same request carried all three. With a plain entry the 400 comes from
   `createStartHandler`, inside the boundary. This is the shape the three Cores
   already had (`src/lib/app-handler.ts`, called from `src/worker.ts`), and they
   were unaffected. Each cell's `api/malformed-path.hurl` pins the result.

ADR 013's constraints 1 (keep `defaultRenderHandler`), 2 (a throwing route
component is an unhandled fault) and 4 (do not deploy on that evidence alone)
are unchanged. Nothing in the 1.169 release notes addresses the
component-throw-answers-200 defect.

## Consequences

- A patch or minor of Start can land through `pnpm install` without a catalog
  edit. The single-version test catches the lockstep failure. The Hurl suites
  and `pnpm run check` catch behaviour changes only when someone runs them.
- 1.169 also changed raw `createStartHandler` to rethrow the original error.
  Both entry shapes already wrap the handler in a `try/catch` that answers a
  text/plain 500 with security headers (`*/core/src/worker.ts`,
  `*/{docs,help,info,news}/src/request-handler.ts`), so an escaping error gets
  that 500 rather than Start's generic JSON one.
- Start's peer range now requires Vite 8 (`>=8.0.0`); the catalog was already on
  `^8.2.2`.

## Outcome

Implemented 2026-10-14. `pnpm run check`, `pnpm run build`,
`pnpm run check:size` and `pnpm run test:api` passed across all seventeen
units. The measurements are in
`evidence/2026-10-14-tanstack-start-1-169-upgrade.md`.
