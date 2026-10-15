# OWASP ASVS 5.0 Level 1–2 review: `app/core`

Date: 2026-09-19

## Scope and method

Static source review and automated checks against OWASP ASVS 5.0 chapters
V1–V17, Level 1 with Level 2 where applicable, run for this workspace only at
`c64c58174397c4fb46e247148a1e490c76f97166` on `develop` (working tree had pre-existing unstaged
`package.json` edits, not touched). No deployment was probed; no dynamic
scanner (ZAP etc.) and no `test:api`/`test:e2e` run was part of this review.

Commands run:

- `pnpm --dir app/core audit --prod --json`: 0 info / 0 low / 0 moderate / 0 high / 0 critical.
- `pnpm --dir app/core run test` (via `pnpm -r run test`): PASS, 31 files / 465 tests.
- `grep` over `app/core/src` for `dangerouslySetInnerHTML`, `innerHTML`, `eval(`,
  `new Function`, `document.cookie`, `localStorage`, `raw(`: no hits outside comments.
- `git ls-files` secret sweep: only `.env.example` / `.dev.vars.example`
  templates tracked; no credential-shaped literal in `src/` or `wrangler.jsonc`.
- Source diffed against its family reference (`app/core`): differences are brand
  copy/constants only.

## Results by chapter

| ASVS chapter                     | Result            | Basis                                                                                                                                                                                                              |
| -------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1 Encoding/sanitization         | PASS              | React escaping; no raw HTML sink.                                                                                                                                                                                  |
| V2 Validation/business logic     | PASS              | Host allowlist before path classification; bounded body reader; `/health/*` other than the three probes blocked (404).                                                                                             |
| V3 Web frontend security         | PASS              | Per-request nonce CSP in production (no `unsafe-inline`/`unsafe-eval`), `base-uri 'none'`, `frame-ancestors 'none'`; application `Set-Cookie` stripped and inbound `Cookie` removed before the app half (ADR 007). |
| V4 API/web service               | PASS              | Rails passthrough rebuilds the request: `Forwarded`/`X-Forwarded-*`/`X-Real-IP` dropped, `X-Request-Id` replaced, `redirect: 'manual'`, 2 s timeout.                                                               |
| V5 File handling                 | N/A               | No upload handled at the edge (bodies stream to Rails).                                                                                                                                                            |
| V6–V10 Authn/session/authz/OAuth | PASS (edge share) | Delegated to Rails; auth paths (`/oidc/*`, `/sign/out*`) get the separate `AUTH_RATE_LIMITER` (60/min) in addition to the general one. Rails side out of scope.                                                    |
| V11 Cryptography                 | PASS              | Nonce from platform CSPRNG (`security-nonce.ts`).                                                                                                                                                                  |
| V12 Secure communication         | PASS              | `RAILS_ORIGIN` must be https (http only for `*.localhost`), no userinfo/path/query — fails closed.                                                                                                                 |
| V13 Configuration                | PASS (see F1)     | Rate limit applied once in `worker.ts` for both branches.                                                                                                                                                          |
| V14 Data protection              | PASS              | Error/unavailable responses `no-store`.                                                                                                                                                                            |
| V15 Secure coding/architecture   | PASS              | Prod dependency audit clean.                                                                                                                                                                                       |
| V16 Logging/error handling       | PASS              | `RailsDispatchLogEntry` is closed unions/numbers only — no cookie, token or body can be logged.                                                                                                                    |
| V17 WebRTC                       | N/A               | Not used.                                                                                                                                                                                                          |

## Findings

Production `ratelimits` namespace ids in this unit: `5001 5101 2001 2101 3001 3101 1001 1101 `.

- **F1 — Medium (V2.4 / V13), CONFIRMED, affects this unit as a co-tenant.** Its
  namespace ids are also used by the eight `com`/`org` public units, so its
  per-IP budget is shared with them (see those units' records).
- **F2 — Withdrawn after follow-up (2026-09-19).** The first pass flagged
  `workers_dev: true` at the production level as a bypass of zone-level WAF on
  the custom domain. On inspection there is no custom domain: `routes` is `[]`
  on purpose because the public hostnames belong to the development Tunnel
  (`adr/008-edge-development-tunnel-exposure.md`), so `*.workers.dev` is the
  only production entry point and there is no zone path to bypass.
  `test/core-dispatch-contract.test.ts` also requires the Cores to keep
  `workers.dev` enabled. Turning it off would take production offline, so no
  change was made. Revisit if a custom domain is ever attached to this Worker.

No High or Critical issue was found in this workspace.
