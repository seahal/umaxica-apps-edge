# Public Information Surfaces

Project Umaxica separates application surfaces from public knowledge surfaces.
The split is framework-level and authority-level: Next.js remains the Core app
surface, Astro owns public information rendering, and Rails remains the source
of truth for policy, mutation, and content JSON authority.

## Surface Matrix

| Workspace family | Core app | Public docs | Public news | Public info | Public help |
| --- | --- | --- | --- | --- | --- |
| `com` | `com/core` | `com/docs` | `com/news` | `com/info` | `com/help` |
| `org` | `org/core` | `org/docs` | `org/news` | `org/info` | `org/help` |
| `app` | `app/core` | `app/docs` | `app/news` | `app/info` | `app/help` |

## Framework Ownership

`*/core` stays on Next.js. Core owns RP/BFF behavior, authenticated UI,
logged-in state, React Aria surfaces, and account, organization, and avatar
operations.

`*/docs`, `*/news`, `*/info`, and `*/help` use Astro. These workspaces are for
public content, MDX, content collections, SSG/SSR, and image optimization.

Rails Core/Base owns durable authority: policy, mutation, content JSON, and
the API contracts consumed by edge surfaces.

## Content API Boundary

Astro public information surfaces consume only public, read-only Rails content
APIs through the Cloudflare Workers private connectivity boundary.

The public Astro contract is intentionally narrow:

- Server-side GET requests only.
- Public/read-only content JSON only.
- No Acme refresh tokens.
- No user-scoped secrets.
- No browser session-cookie forwarding.
- No generic Rails proxy endpoint in Astro.

Authenticated RP/BFF behavior remains in Core Next.js. Authorization and
mutation remain in Rails Core/Base.

## Migration Notes

The current repo may still contain Next/OpenNext public information workspaces.
That is an implementation state, not the target architecture.

When implementation starts, migrate public information workspaces without
touching `*/core` framework ownership. Add `info` workspaces for `app`, `com`,
and `org` before or during the Astro migration so all public information
families have the same surface set.
