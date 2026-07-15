# ADR 004: Public Information Surfaces Use Astro

## Status: Accepted

## Context

Project Umaxica has separate edge workspaces for Core application surfaces and
public information surfaces. Core application surfaces need authenticated
state, RP/BFF behavior, logged-in UI, React UI primitives, and account,
organization, and avatar operations. Public information surfaces need fast,
lightweight content delivery, MDX authoring, content collections, SSG/SSR, and
image optimization.

The repository currently has Next.js workspaces for `core`, `docs`, `news`,
and `help` across the `app`, `com`, and `org` families. The target architecture
keeps Core on Next.js and introduces Astro only for public information surfaces.

## Decision

Core workspaces remain Next.js. Do not replace Core Next.js with Astro.

Astro is introduced only for public information surfaces:

- `docs`
- `news`
- `info`
- `help`

The surface split is:

| Surface         | Framework | Responsibility                                                                       |
| --------------- | --------- | ------------------------------------------------------------------------------------ |
| `*/core`        | Next.js   | RP/BFF, authenticated UI, React Aria, logged-in state, account/org/avatar operations |
| `*/docs`        | Astro     | Public documentation and knowledge content                                           |
| `*/news`        | Astro     | Public news and announcements                                                        |
| `*/info`        | Astro     | Public informational pages                                                           |
| `*/help`        | Astro     | Public help content                                                                  |
| Rails Core/Base | Rails     | Source of truth, authority, policy, mutation, content JSON authority                 |

Astro surfaces may consume only public, read-only content APIs from Rails
through the Cloudflare Workers private connectivity boundary. They must not
receive Acme refresh tokens, user-scoped secrets, browser session cookies, or
authorization material intended for authenticated Core flows.

## Consequences

- Next.js remains the framework for `app/core`, `com/core`, and `org/core`.
- Astro becomes the framework for `app|com|org` public information workspaces:
  `docs`, `news`, `info`, and `help`.
- Rails remains the authority for durable content JSON, policy, and mutation.
- Cloudflare Workers are the edge runtime and the private connectivity boundary
  between Astro/Next surfaces and Rails private APIs.
- Astro must not implement RP/BFF behavior, authenticated mutation, account
  authority, organization authority, avatar authority, or refresh-token handling.
- Public content fetchers must be explicit and narrow; no generic Rails proxy
  route should be added to Astro.

## Implementation Notes

This ADR records the framework and authority boundary only. It does not
implement the migration.

The edge migration should happen in a later implementation slice:

1. Add `info` workspaces for `app`, `com`, and `org`.
2. Convert `docs`, `news`, `info`, and `help` public workspaces to Astro.
3. Keep `core` workspaces on Next.js/OpenNext.
4. Add a server-only public content client for read-only Rails content JSON
   once the Rails API contract is available.
5. Verify with Vite+ commands: `vp install`, `vp check`, and `vp test`.

## Outcome

Accepted as the target architecture. Implementation is intentionally deferred.
