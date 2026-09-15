# ADR 019: Edge boundaries that can ship beside the Rails rewrite

## Status

Accepted and implemented for the independent Edge slices recorded here on
2026-09-15. The Rails Preference reference was inspected read-only at the
specified SHA during the handoff review. TanStack public locale URL integration,
authentication work and live production integration remain deferred because the
published URL contract and external runtime contracts are not all approved.

The twelve public content cells are TanStack Start/Vite in the current tree.
The earlier Astro record in `adr/015-public-content-surfaces-astro.md` is kept
as history; this ADR and the current worker manifest describe the active Edge
boundaries.

## Context

The Edge repository is being changed while the Rails repository is undergoing a
larger rewrite. The Rails reference SHA
`7bee4819ffe2a402c63a04af2a368bfcaf253c0d` was available only through a
read-only temporary reference checkout during the handoff. Its Preference
implementation can therefore be cited, while JWT and authorization behavior
remain outside this work. The Edge work needs explicit boundaries that can be
tested with local fixtures and fake bindings without weakening authentication or
changing Rails.

The implementation plan and its baseline are in
[`plans/edge-parallel-contracts-2026-09.md`](../plans/edge-parallel-contracts-2026-09.md).
The plan's P0 review approved only work that is independent of Rails or has a
fixed, inspected contract, and keeps every deployment unit's local configuration
boundary.

## Decision

### 1. Keep three Rails communication contracts separate

- The twelve public content cells use their existing fixed private Rails
  origin, surface/audience and fixed endpoint paths. They use the Workers VPC
  transport or an explicitly selected local test transport. Request cookies,
  `Authorization` and access secrets are not forwarded, and a VPC failure has
  no public Internet fallback. Public content responses use the existing
  contract-specific status mapping and schema checks.
- The three Core cells use their configured `RAILS_ORIGIN` through ordinary
  public HTTPS `fetch`. They do not use the Workers VPC, the public content
  client or a VPC-to-Internet fallback. No JWT, JWKS or new authentication
  header is introduced.
- Core Rails-owned paths use the transparent dispatcher contract. Path,
  method, query, request body, permitted browser headers and CSRF material are
  forwarded according to the existing ownership table. Rails status,
  redirects, `Set-Cookie`, `Content-Type`, cache headers and body are returned
  without CMS-client mapping. The normal Edge-owned input cap and content JSON
  cap do not apply to this relay. A relay timeout is 504, an unavailable or
  unconfigured origin is 503, and an error does not fall through to TanStack.

### 2. Use bounded, single-attempt communication

The external request budget is 2,000 ms from request start through bounded body
reading. The signal is passed to body reads; it is not stopped when headers
arrive. There is no retry or deadline propagation. Edge response generation has
a 3,000 ms budget and returns a fixed 503 when that budget expires. Timers,
abort signals, late promise settlement and reader cleanup are part of the
tests.

Edge-owned JSON, form and Server Function inputs are limited to 65,536 bytes,
measured as bytes while reading. The public content JSON response limit is
1,048,576 bytes, also measured while reading. Rails passthrough bodies,
uploads, streaming contracts and static assets are excluded from the ordinary
Edge-owned input rule. Unsupported content encodings are rejected before
processing; compressed bodies are not expanded without a bounded contract.

The public client treats only the confirmed detail-entry 404 as resource
absence. A collection 404 remains an upstream error and maps to 502. The
public client maps 429 to 503, upstream 5xx and contract failures to 502,
connection failure to 503, timeout to 504, and does not follow redirects.
These mappings do not apply to the Core transparent relay.

### 3. Keep preference writes and framework responsibilities explicit

Hono keeps its current language detection order, including query, language
Cookie and `Accept-Language`, together with the existing `Vary` behavior. Its
language detector is configured with `caches: false`; Edge does not issue,
refresh or delete the preference Cookie. Rails is the preference-cookie writer
under the current contract.

The inspected Rails reference fixes the Preference facts needed for a later
TanStack implementation: available locales are `en` and `ja`, locale input is
lowercased and rejected when it is not in `I18n.available_locales`, the language
Cookie name is `language`, and request context uses `lx` with `ri` in `jp`/`us`.
Rails uses its Preference/Actor source for its own I18n locale; the Edge contract
may read a valid Rails language Cookie for public display, but must never use it
for authentication or forward it as a credential. The current public routes still
use `/{lang}/` in canonical, hreflang and sitemap URLs. Connecting the new
`lx` → Cookie → `ja` priority to those routes would make query-selected content
disagree with the current path canonical. Query canonical adoption is not
approved, so this route/SEO integration remains P3b NO-GO. No Accept-Language
fallback change, JWT decode, authentication stub or anonymous dashboard route is
added in the meantime.

Hono uses the fixed Hono `bodyLimit` API. TanStack Start's fixed-version default
CSRF behavior remains in place; no speculative `start.ts` or invented body
limit middleware is added. CORS is not newly allowed. A future API may propose
the smallest origin/method/header set with tests and review.

### 4. Apply the entry and cache boundaries to the right owner

The five apex workers, three Cores and twelve public cells derive Host policy
from their existing unit configuration. Unknown Host is rejected with 421
before rate limiting, routing or external communication. `X-Forwarded-Host` is
not trusted. Edge-generated responses receive the applicable security headers,
and request identifiers/logging use safe allowlisted fields. Cookies,
authorization values, arbitrary query/path values, bodies and raw exception
messages are not logged. Rails-generated response headers are preserved by the
transparent relay.

The Hono offline route, registration script and service worker fallback have
been removed. TanStack's service worker serves one fixed, nonce-free offline
document only after a same-origin GET navigation's network fetch rejects. It
does not intercept API, RPC, JavaScript, CSS, OIDC, sign-out, health, metadata,
cross-origin or Rails-owned paths, and it does not cache personalized or
authenticated responses. HTTP 404 and 500 responses remain online HTTP
errors. Existing browser registrations are a separate rollout question; local
source removal is not evidence that a deployed browser has already updated.

Request identity and completion logging are also kept per runtime owner. Each
of the fifteen TanStack units has a local `request-log.ts` emitter and an
installed request-local store. It generates a UUID at the Edge entry, ignores
an incoming `X-Request-ID`, returns the generated value in the Edge response,
and forwards only that value on an allowed Rails client hop. Its output is a
closed `edge_request` record with service, environment, method, fixed route
class, final status, duration and coarse outcome. Core's transparent Rails
relay uses its existing `rails_dispatch` record as the single completion event
for that relay, with the same generated ID and final Edge status; it does not
add a duplicate generic completion record. No log path accepts raw URL,
headers, cookies, authorization, body or exception text.

## Deferred decisions and verification

The following remain outside this accepted parallel slice:

- Core JWT/JWKS, OIDC, session, refresh, revocation, AAL and final authorization;
- TanStack public locale URL migration, Paraglide request isolation wiring,
  invalid-`lx` URL normalization, region links and authentication-dependent
  dashboard routes;
- canonical, hreflang, sitemap and any query-based SEO policy;
- the apparent `info` host/region configuration question, until the active
  host table is confirmed rather than duplicated by hand;
- production binding presence, real workerd/VPC behavior, live Rails response
  schemas, request-ID adoption by Rails, and production deployment;
- whether a limited same-URL service-worker retirement update is required for
  already registered browsers; and
- the existing production binding fail-fast follow-up, without inventing an
  Issue number.

The local evidence records what was actually run. The Rails reference audit is
recorded in
[`evidence/2026-09-15-rails-preference-reference.md`](../evidence/2026-09-15-rails-preference-reference.md).
No Rails code, Rails runtime, Cloudflare deployment or remote GitHub write was
performed by this decision.

## Outcome

Implemented Edge-only slices are recorded by commits `4929730c`, `5bc6538c`,
`eca6a58b`, `963377c3`, `f92e2c8e`, `8fc13a12`, `9b78df1e`, `88a2f907`,
`f8fadf08`, `0f83b4d6` and `86404e2e`, with their per-stage tests and evidence
in `evidence/`. The fixed Rails Preference contract is now audited; the public
locale URL/SEO integration remains explicitly P3b NO-GO. P6's combined verification is recorded in
`evidence/2026-09-15-edge-final-verification.md`. This ADR is the current
summary of the transport, timeout, body, Cookie, entry, logging and offline
boundaries for the parallel work. The type-only follow-up is `d9c32ce2`, and
the documentation/evidence closure is `bd3d3ec5`.
