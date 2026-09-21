# Security Policy

This is the edge layer of Umaxica: a public, Apache-2.0 monorepo of twenty
Cloudflare Workers. The Rails application behind it lives in a different
repository and is not covered by this policy.

## Reporting a vulnerability

**Use [GitHub private vulnerability
reporting](https://github.com/seahal/umaxica-apps-edge/security/advisories/new).**
The report is visible only to the maintainer, and the fix and the published
advisory are coordinated in that same thread. It is the right channel even if
you are unsure whether what you found is exploitable.

For hardening suggestions, questions about this policy, and anything that is
not yet a vulnerability, [open an
issue](https://github.com/seahal/umaxica-apps-edge/issues). Issues are public:
do not put reproduction steps or a working exploit for an unfixed problem
there.

A report is easiest to act on when it names:

- the deployment unit (`app/core`, `com/apex`, …) or the hostname involved,
- the commit SHA you tested, or `main`,
- what you did, what happened, and what an attacker gets out of it,
- whether you have disclosed it anywhere else, or intend to.

## What to expect

One person maintains this repository. These are honest targets, not a
contractual SLA:

| Stage                      | Target              |
| -------------------------- | ------------------- |
| Acknowledgement            | within 7 days       |
| Initial assessment         | within 14 days      |
| Updates while it is open   | every 14 days       |
| Fix and published advisory | depends on severity |

An accepted report gets a GitHub security advisory, and you are credited in it
unless you ask not to be. A declined report gets a written reason rather than
silence. There is no bug bounty and no payment of any kind.

## Supported versions

This project publishes no versioned releases; it is continuously deployed to
Cloudflare. Only `main`, and what is currently deployed from it, is supported.
There are no maintenance branches and no backports — a fix lands on `main` and
ships. `develop` is the working branch and carries no security guarantee.

## Scope

In scope: the twenty deployment units listed in `pnpm-workspace.yaml` (see the
workspace table in `README.md`) and their production hostnames under
`umaxica.com`, `umaxica.app`, `umaxica.org`, `umaxica.net`, and `umaxica.dev`.

Out of scope:

- The Rails application and its repository. Report those there, not here.
- Cloudflare's own platform — Workers, Tunnel, Access. Report those to
  Cloudflare.
- Development tunnel hostnames and every non-production environment. That
  exposure is deliberate and already reasoned about in
  `adr/008-edge-development-tunnel-exposure.md` and
  `adr/014-edge-owned-development-tunnel.md`.
- Test fixtures and obviously fake data, such as the example addresses in unit
  tests. They are not leaked credentials.
- Scanner output with no demonstrated impact, and missing "best practice"
  headers on responses that already carry the policy in `public/_headers`.
- Denial of service, load testing, and rate-limit probing. See
  `adr/010-first-touch-rate-limiting.md`; do not run any of it against
  production.
- Social engineering, physical attacks, and anything aimed at the maintainer
  rather than at the code.

## Testing guidelines

Research in good faith, against your own data and your own accounts only. Do
not access, modify, or take other people's data. Do not degrade the service for
anyone else. Stop as soon as you have confirmed impact — you do not need to
prove how far it goes — and report it. Research that stays inside these lines
will not be treated as a violation.

## What this repository already does

Worth knowing before you report, because these are deliberate:

- **Response headers.** Every unit ships its own `public/_headers` with a
  `default-src 'self'` CSP (`object-src 'none'`, `frame-ancestors 'none'`),
  HSTS with `preload`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, and a deny-all `Permissions-Policy`. See
  `app/apex/public/_headers`.
- **Cookie boundary.** `*/core/src/worker.ts` strips every `Set-Cookie` from
  frame responses; Rails is the only preference-cookie writer. Rails-owned
  passthrough preserves Rails cookies, while apex and TanStack code only reads
  permitted display values. See `adr/007-shared-fqdn-core-dispatch.md`.
  Browser code reads cookies only through the Cookie Store API
  (`docs/development/browser-cookie-access.md`).
- **Logging.** The sanctioned emitters are `*/apex/src/structured-logger.ts`,
  the local `*/{core,docs,help,info,news}/src/lib/request-log.ts` copies for
  TanStack request completion, and `*/core/src/lib/rails-dispatch-log.ts` for
  the Rails hop. `no-console` is an error everywhere else. All emit the closed
  `{ level, msg, data }` envelope; request completion carries only the generated
  request ID, fixed service/environment/method/route, final status, duration
  and rough outcome. No emitter accepts free text, credentials, query, body or
  exception details.
- **Secrets.** No credential lives in the repository or the container image.
  See `docs/development/credential-and-secret-management.md` and
  `docs/development/container-security-policy.md`.
- **CI.** `.github/workflows/integration.yaml` runs a blocking
  `pnpm audit --audit-level=high` and gitleaks secret scanning on every push
  and pull request. Dependabot checks npm dependencies weekly
  (`.github/dependabot.yml`).
