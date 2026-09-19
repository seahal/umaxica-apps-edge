# ADR 021: HSTS with preload on every Edge response

## Status

Accepted — 2026-09-19. Approved by the repository owner.

## Context

The five apex Workers already sent
`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`. The
three Cores and twelve public frames sent the same header without `preload`,
and their `security-headers.ts` said why: joining the browser preload list is
effectively irreversible and binds every subdomain to HTTPS, so it was a
decision to take once for the whole zone rather than one a frame takes alone.

The Rails application already operates on the basis that the zone is
HTTPS-only. The OWASP ASVS review of 2026-09-19 recorded the Edge side as
undecided (finding F3 in `evidence/2026-09-19-asvs-*.md`).

## Decision

The zone uses HSTS with preload. Every Edge response carries

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

from the Worker's `security-headers.ts` in all twenty deployment units, and from
`public/_headers` in the five apex units, whose static assets carry it too.

`preload` has effect only on the registrable domain's own response; on a
subdomain it is ignored. It is sent everywhere so that one value holds across
the zone and no unit has to know which hostname it answers on.

## Consequences

- Every subdomain of the zone must serve HTTPS. Plain HTTP stops working for
  any host under these domains once a browser has seen the header (and for all
  browsers once the domain is on the preload list).
- Submission to the browser HSTS preload list is permitted by this decision. Removal from
  the list takes months and is not a rollback path.
- Local development is unaffected: `*.localhost` is not under the zone, and
  `vite dev` answers with the development header set.
- `api/security-headers.hurl` in every unit asserts `preload`.
