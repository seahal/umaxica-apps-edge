# OWASP ASVS 5.0 Level 1–2 review: `com/apex`

Date: 2026-09-19

## Scope and method

Static source review and automated checks against OWASP ASVS 5.0 chapters
V1–V17, Level 1 with Level 2 where applicable, run for this workspace only at
`c64c58174397c4fb46e247148a1e490c76f97166` on `develop` (working tree had pre-existing unstaged
`package.json` edits, not touched). No deployment was probed; no dynamic
scanner (ZAP etc.) and no `test:api`/`test:e2e` run was part of this review.

Commands run:

- `pnpm --dir com/apex audit --prod --json`: 0 info / 0 low / 0 moderate / 0 high / 0 critical.
- `pnpm --dir com/apex run test` (via `pnpm -r run test`): PASS, 19 files / 110 tests.
- `grep` over `com/apex/src` for `dangerouslySetInnerHTML`, `innerHTML`, `eval(`,
  `new Function`, `document.cookie`, `localStorage`, `raw(`: no hits outside comments.
- `git ls-files` secret sweep: only `.env.example` / `.dev.vars.example`
  templates tracked; no credential-shaped literal in `src/` or `wrangler.jsonc`.
- Source diffed against its family reference (`app/apex`): differences are brand
  copy/constants only.

## Results by chapter

| ASVS chapter                                         | Result        | Basis                                                                                                                                                                                                        |
| ---------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1 Encoding/sanitization                             | PASS          | hono/jsx escapes output; no raw HTML sink.                                                                                                                                                                   |
| V2 Validation/business logic                         | PASS          | Host allowlist (421), `Content-Encoding` ≠ identity → 415, `bodyLimit` 64 KiB → 413, 3 s response timeout.                                                                                                   |
| V3 Web frontend security                             | PASS          | `secureHeaders`: CSP `default-src 'self'`, no inline script/style attrs, `frame-ancestors 'none'`, XFO DENY, nosniff, `Referrer-Policy: no-referrer`, HSTS; same set in `public/_headers` for static assets. |
| V4 API/web service                                   | PASS          | Machine endpoints are fixed documents; not language-negotiated.                                                                                                                                              |
| V5 File handling                                     | N/A           | No upload or file path input.                                                                                                                                                                                |
| V6/V7/V8/V9/V10 Authn, session, authz, tokens, OAuth | N/A           | Unauthenticated public pages; no session or token handled.                                                                                                                                                   |
| V11 Cryptography                                     | N/A           | No crypto beyond platform request IDs.                                                                                                                                                                       |
| V12 Secure communication                             | PASS          | HSTS + `upgrade-insecure-requests`.                                                                                                                                                                          |
| V13 Configuration                                    | PASS (see F1) | Rate limiter first-touch, per-IP key with per-path fallback; probe exemptions are constants only.                                                                                                            |
| V14 Data protection                                  | PASS          | Language detector cache disabled (no cookie written); `no-store` on status/error pages.                                                                                                                      |
| V15 Secure coding/architecture                       | PASS          | Prod dependency audit clean; lockfile + `minimumReleaseAge` policy.                                                                                                                                          |
| V16 Logging/error handling                           | PASS          | Structured logger only; inbound `X-Request-Id` never trusted; error page has no stack trace.                                                                                                                 |
| V17 WebRTC                                           | N/A           | Not used.                                                                                                                                                                                                    |

## Findings

Production `ratelimits` namespace ids in this unit: `2002 3002 1002 `.

- F1 (shared rate-limit namespace) does **not** apply: ids are brand-specific.
- **F2 — Withdrawn after follow-up (2026-09-19).** The first pass flagged
  `workers_dev: true` at the production level as a bypass of zone-level WAF on
  the custom domain. On inspection there is no custom domain: `routes` is `[]`
  on purpose because the public hostnames belong to the development Tunnel
  (`adr/008-edge-development-tunnel-exposure.md`), so `*.workers.dev` is the
  only production entry point and there is no zone path to bypass.
  `test/core-dispatch-contract.test.ts` also requires the Cores to keep
  `workers.dev` enabled. Turning it off would take production offline, so no
  change was made. Revisit if a custom domain is ever attached to this Worker.
- **F3 — Resolved (2026-09-19).** The owner accepted HSTS preload for the whole
  zone (`adr/021-hsts-preload.md`); the Core and public frames now send the same
  `max-age=31536000; includeSubDomains; preload` value as this unit.

No High or Critical issue was found in this workspace.
