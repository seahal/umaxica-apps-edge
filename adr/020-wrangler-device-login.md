# ADR 020: Wrangler authenticates with the Device Authorization Grant

## Status

Accepted — 2026-09-19.

## Context

The twelve TanStack public content surfaces reach Rails over the Workers VPC
binding (ADR 005, ADR 006; the Cores left it in ADR 018). A remote-binding
session accepts only OAuth; an API token is rejected with `10405`. So every VPC
check (`check:vpc`, `check:preview:vpc`, `preview:vpc`) starts with a
`wrangler login`.

The default `wrangler login` uses Authorization Code + PKCE and redirects the
browser to `http://localhost:8976/oauth/callback`. That works only from a browser
on the container host through the published port. Under `podman exec`, over
SSH, or from another machine the redirect has no route, the code is stranded,
and it cannot be redeemed by any process but the one that started the flow.

## Decision

Authenticate Wrangler with the Device Authorization Grant:

```bash
pnpm exec wrangler login --device
```

Wrangler prints a verification URL and a user code; approve it in any browser
on any machine. The CLI polls the token endpoint itself, so only outbound HTTPS
is needed. `pnpm run login:device` wraps this with `--no-browser
--no-use-keyring` for the container. Confirm with `pnpm exec wrangler whoami`.

An API token remains unusable for remote bindings and is not an alternative.

## Consequences

- One login procedure works from every environment: container, `podman exec`,
  SSH and remote browsers.
- No inbound port is required for authentication.
- `docs/development/wrangler-authentication.md` carries the operational details.
