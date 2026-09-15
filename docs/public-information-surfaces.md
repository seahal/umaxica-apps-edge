# Public Information Surfaces

Project Umaxica separates application surfaces from public knowledge surfaces.
The split is **authority-level, not framework-level**: Rails remains the source
of truth for policy, mutation, and content JSON authority, and the Edge surfaces
differ in what they are allowed to do rather than in what they are built with.

> **Current framework note (2026-09-15).** `adr/004-public-information-surfaces-astro.md`
> and `adr/015-public-content-surfaces-astro.md` are historical Astro decisions.
> The active tree and `tools/workers-manifest.json` classify all twelve public
> cells as TanStack Start/Vite with the Workers VPC binding. The three `*/core`
> units also stay on TanStack Start and the five `*/apex` Workers stay on Hono
> (`adr/011`). The current Edge transport, body, timeout, Cookie, logging and
> offline boundaries are in `adr/019-edge-parallel-contract-boundaries.md`.
> Rails Preference precedence, authentication-dependent shell wiring and SEO
> URL policy remain the explicit P3 hold in the implementation plan.

## Surface Matrix

| Workspace family | Core app   | Public docs | Public news | Public info | Public help |
| ---------------- | ---------- | ----------- | ----------- | ----------- | ----------- |
| `com`            | `com/core` | `com/docs`  | `com/news`  | `com/info`  | `com/help`  |
| `org`            | `org/core` | `org/docs`  | `org/news`  | `org/info`  | `org/help`  |
| `app`            | `app/core` | `app/docs`  | `app/news`  | `app/info`  | `app/help`  |

## Framework Ownership

The twelve public content surfaces run **TanStack Start on Vite**. The three
cores run the same framework, and the five apex workers run **Hono**. The
current boundary is recorded in ADR 019; the Astro records stay historical and
`adr/004` stays `Rejected` as history.

What differs between the two archetypes is capability, and it is deliberate:

`*/core` owns RP/BFF behavior, authenticated UI, logged-in state, React Aria
surfaces, and account, organization, and avatar operations. It is the only
archetype that holds session material.

`*/docs`, `*/news`, `*/info`, and `*/help` are public content surfaces. They are
limited to public content and read-only content APIs.

Rails Core/Base owns durable authority: policy, mutation, content JSON, and the
API contracts consumed by edge surfaces.

## Content API Boundary

Public information surfaces consume only public, read-only Rails content APIs
through the Cloudflare Workers private connectivity boundary. The contract is
intentionally narrow:

- Server-side GET requests only.
- Public/read-only content JSON only.
- No Acme refresh tokens.
- No user-scoped secrets.
- No browser session-cookie forwarding.
- No generic Rails proxy endpoint on a public surface.

Authenticated RP/BFF behavior remains in `*/core`. Authorization and mutation
remain in Rails.

Two mechanisms enforce this rather than convention alone: `*/core/src/worker.ts`
strips credentials on the Rails hop (ADR 007), and
`tools/workers-manifest.json` classifies each Worker so `pnpm run check:workers`
fails a surface that declares a binding its class is not allowed to hold.

## Implementation State

The three cores are classified `railsBackedVite` and the twelve public surfaces
`railsBackedVpcVite` in `tools/workers-manifest.json`. All fifteen carry the VPC
binding.
On the twelve public surfaces the VPC binding is used for `/health` (ADR 016)
and for **publishing pages**: `/{lang}/entries/` and `/{lang}/entries/{public_id}/`
are TanStack Start server routes that call the existing `getRailsClient()` on every
request. Rails remains the publishing authority for persistence, management UI,
create/update, revisions, publication, archive, and authorization. The public
cell is anonymous and read-only. Collection pagination is page-based: `/{lang}/entries/?page=N`
causes Edge to request `GET /api/v0/entries?locale={lang}&page=N`. Edge does not
calculate SQL OFFSET; Pagy is a Rails implementation detail. Page 1 is
`/{lang}/entries/`. Identity is `public_id` on both the public URL and the Rails
management member URL. Language homes `/{lang}/` are server-rendered per request
and link to `/{lang}/entries/`. `/{lang}/about/` is an Edge-generated page with no
Rails hop. There is no
publishing SSG of Entry pages, no browser-side Rails fetch, and no
application-level publishing cache in this phase (`docs/caching-and-isr.md`
Phase 2 remains future work).

Public collection and entry pages always expose a Manage / Edit link to the
browser-facing Rails Base.Org staff origin (`RAILS_STAFF_BASE_ORIGIN`), for example
`{origin}/publishing/{surface}/{audience}/entries` and
`{origin}/publishing/{surface}/{audience}/entries/{public_id}/edit`. The link is
not gated on Edge authentication. Rails performs sign-in and authorization after
navigation. That origin is not the Worker-to-Rails VPC transport.

`org/core` `/publishing` is the authenticated operator launcher for the same
twelve Rails management indexes. It does not implement Publishing mutations.
