# OWASP ASVS 5.0 Level 1–2 review: `org/info`

Date: 2026-09-19

## Scope and method

Static source review and automated checks against OWASP ASVS 5.0 chapters
V1–V17, Level 1 with Level 2 where applicable, run for this workspace only at
`c64c58174397c4fb46e247148a1e490c76f97166` on `develop` (working tree had pre-existing unstaged
`package.json` edits, not touched). No deployment was probed; no dynamic
scanner (ZAP etc.) and no `test:api`/`test:e2e` run was part of this review.

Commands run:

- `pnpm --dir org/info audit --prod --json`: 0 info / 0 low / 0 moderate / 0 high / 0 critical.
- `pnpm --dir org/info run test` (via `pnpm -r run test`): PASS, 35 files / 404 tests.
- `grep` over `org/info/src` for `dangerouslySetInnerHTML`, `innerHTML`, `eval(`,
  `new Function`, `document.cookie`, `localStorage`, `raw(`: no hits outside comments.
- `git ls-files` secret sweep: only `.env.example` / `.dev.vars.example`
  templates tracked; no credential-shaped literal in `src/` or `wrangler.jsonc`.
- Source diffed against its family reference (`app/info`): differences are brand
  copy/constants only.

## Results by chapter

| ASVS chapter                     | Result         | Basis                                                                                                                                                               |
| -------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1 Encoding/sanitization         | PASS           | React escaping; Rails entry id is `encodeURIComponent`-encoded into the upstream path.                                                                              |
| V2 Validation/business logic     | PASS           | Host allowlist (421) before routing; bounded request body; Rails JSON read with a byte limit.                                                                       |
| V3 Web frontend security         | PASS           | Nonce CSP in production, `frame-ancestors 'none'`, `script-src-attr 'none'`; static assets covered by `public/_headers`; browser cookies only via Cookie Store API. |
| V4 API/web service               | PASS           | Read-only public content; fixed upstream paths.                                                                                                                     |
| V5 File handling                 | N/A            | No upload.                                                                                                                                                          |
| V6–V10 Authn/session/authz/OAuth | N/A            | Unauthenticated public content. Staff management links point at a validated `RAILS_STAFF_BASE_ORIGIN` (no creds/path/query, not a VPC host).                        |
| V11 Cryptography                 | PASS           | CSP nonce from platform CSPRNG.                                                                                                                                     |
| V12 Secure communication         | PASS           | HSTS, `upgrade-insecure-requests`.                                                                                                                                  |
| V13 Configuration                | **FINDING F1** | See findings.                                                                                                                                                       |
| V14 Data protection              | PASS           | No personal data stored; error responses `no-store`.                                                                                                                |
| V15 Secure coding/architecture   | PASS           | Prod dependency audit clean.                                                                                                                                        |
| V16 Logging/error handling       | PASS           | One typed completion log line; generic 500 body.                                                                                                                    |
| V17 WebRTC                       | N/A            | Not used.                                                                                                                                                           |

## Findings

Production `ratelimits` namespace ids in this unit: `5001 2001 4001 3001 1001 `.

- **F1 — Medium (V2.4 anti-automation / V13 configuration), CONFIRMED.** This
  `org` unit uses the `app` brand's namespace ids (`1001`…`5001`). ADR 010
  assigns ids per brand (`com`/`org` apex and core use `1002`/`1003` etc.), so
  this Worker's per-IP budget (2000/60 s) is shared with `app/apex`, `app/core`
  and every other public unit: one client can exhaust it on one surface and be
  429'd on all of them, and the effective limit per surface is not what the
  config reads. Fix: give each brand's public units its own ids.
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
