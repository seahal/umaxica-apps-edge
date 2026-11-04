# Search metadata and structured data (edge)

**Status: Deferred / future consideration.** This is not an implementation spec.
Nothing here is built, and this document does not describe current behavior
except where it explicitly says so. It records the principles to apply _when_
search metadata is taken up on the edge layer, so that the decision is made
deliberately rather than improvised per frame.

No code was changed when this document was written.

## Why metadata is not "just SEO"

Search metadata is part of the public interface of the product. It carries:

- site and service identity
- brand expression
- the meaning of a page
- URL and routing identity
- multilingual relationships
- presentation quality in search results

Treating it as decoration invites drift: fifteen frames each inventing their own
title suffix, their own host in a canonical URL, their own idea of what the
organization is called.

But the edge layer does not automatically own that interface. Ownership follows
whoever produces the final HTML document — Rails, a TanStack Start frame, a Hono
apex Worker, or a static site.

## Scope of the design area

When this is picked up, treat the following as one design area:

`<title>`, meta description, canonical URL, hreflang, favicon, Open Graph,
social metadata, robots, sitemap, breadcrumb, structured data / JSON-LD.

They share an area, not an implementation. Their purposes differ, so they should
not be forced into one large configuration object. What is worth sharing is
**meaning, naming contract, required fields, and validation contract** — not a
runtime structure.

## Edge and origin ownership

This is the point most likely to be got wrong here: **edge routing is not
metadata ownership.**

When a Worker only does:

```text
Request
→ routing / dispatch
→ a frame or Rails
→ HTML response
```

the Worker has no reason to own metadata. The default direction is:

> the application that generates the final HTML document generates the metadata.

The edge becomes the source of truth only for pages whose HTML the edge Worker
itself renders.

In this repository that distinction is real, not hypothetical: the `*/apex`
Hono workers do render HTML directly (they own a JSX renderer and serve
`/about` and `/health` themselves), while their redirect and dispatch paths do
not produce a document at all. Any future work must separate those two roles
inside the same worker rather than labelling the whole worker "edge-owned".

Current state, for the record: each `*/apex` worker already has a small
per-frame `src/seo.tsx` (`Meta`, `setMeta`/`getMeta`, `SeoHead`) covering title,
description, canonical, robots, Open Graph and Twitter card, plus `src/brand.ts`
for title composition. That is the existing edge-owned surface. Any future work
starts from it rather than from a blank sheet, and stays per-frame — the
duplication across frames is intentional.

Deciding for a given Hono/Workers surface means asking:

- does it generate HTML directly?
- does it own a JSX / renderer layer?
- is it purely an API?
- is it a reverse proxy or routing layer?
- does it only dispatch to a frame or to Rails?

Pure routing and API workers get no search metadata.

## The fifteen frames

Where a frame owns the document, prefer the framework's own metadata mechanism
over anything bespoke — in TanStack Start that is a route's `head` option, which
returns `meta` and `links` arrays that `<HeadContent />` renders into the
document. Canonical, alternates, Open Graph, robots and sitemap all fit there.

**One caveat that already cost this repository a bug**, recorded because it is
the first thing an implementer will hit: TanStack Router has **no title template
primitive**. Next's Metadata API had `title.template` and `title.absolute`;
TanStack has neither, and a nested route's title simply overrides its ancestor's.
Each frame therefore composes the brand suffix itself in
`src/lib/title.ts`, and setting `title` on a route without going through it
produces either a wrong suffix or — if an ancestor also sets one — two `<title>`
elements in one document. `test/html-title-contract.test.ts` at the repository
root checks the emitted HTML for exactly this. See
`docs/design/ui-shell-contract.md` §14 and `adr/013-frames-tanstack-start.md`.

Do not build an in-house metadata framework beyond that one function. The
concrete API surface and its options must be checked against the TanStack Start
documentation current at implementation time; this document deliberately does not
pin them, because they moved often before Start became stable (1.169, adr/026).

## Structured data

Schema.org / JSON-LD is a future candidate. Likely types:

```text
Organization
WebSite
WebPage
BreadcrumbList
Article / BlogPosting
```

Not applied uniformly to every page. Emit only the structured data a page's role
actually justifies.

## Identity

Any future design should be able to distinguish at least:

```text
Organization
Site
Service
Page
```

Do not collapse FQDN, deployment environment, application identity, and brand
identity into one string. In particular, keep

```text
production / development / test
```

separate from the public-facing distinction between the `app` / `com` / `org`
families. The port-and-family scheme in `CLAUDE.md` is an internal addressing
convention and is not a brand or identity vocabulary.

## Routing and canonical

Edge routing can be complex, so canonical URL design is recorded here as an
important open question. Multiple paths to the same content, Rails and a frame
sharing an FQDN, redirects, rewrites, internal service URLs, Cloudflare Access,
and development FQDNs may all exist.

Whatever the topology, the canonical identity shown to search engines is based
on the **public** URL. Internal VPC URLs, localhost URLs, and service-binding
URLs must never leak into metadata. The concrete rules are undecided and belong
to implementation time.

## i18n

When multilingual support arrives, design the relationship between locale, URL,
title, description, canonical, alternate language, and structured data text
explicitly.

Locale ownership may sit in different places for a frame, Rails, and the edge,
so the actual routing contract has to be checked then. `hreflang` design is a
separate task and is not settled here.

## Code sharing

Do not add runtime coupling between applications or deployment units for the
sake of search metadata. This repository has no `shared/` directory by design,
and metadata is not a reason to introduce one.

Prefer to share:

```text
naming contract
metadata semantics
brand vocabulary
required fields
validation rules
docs
tests
```

Be cautious about sharing:

```text
runtime package
cross-repository import
central metadata service
network dependency
```

Where a framework has a standard API, use it rather than abstracting over it.

## Validation (future)

Metadata drift is worth detecting eventually. Candidate checks:

- title naming contract
- canonical host
- duplicate suffix
- internal URL leakage
- environment name leakage
- missing description
- malformed structured data

Not implemented. Existing parity and validation scripts were not modified for
this document; extending them is a future candidate only.

## Future work

- Decide, per `*/apex` worker, which routes render HTML and are therefore
  metadata-owning, and which are dispatch-only.
- Decide where locale ownership sits once i18n is real.
- Decide the canonical host rules for surfaces where Rails and a frame share an
  FQDN.

## When this is implemented

Re-check primary sources at that time, in this order:

1. Google / Bing search-engine documentation
2. Schema.org
3. W3C / web standards
4. TanStack Start / Hono / Cloudflare documentation
5. trustworthy secondary sources

Search appearance and framework APIs change. Do not freeze current specifics
into this document.

## Granularity

This is not a detailed design document. Because the edge layer's routing,
framework, and origin-ownership boundaries are tangled, it only needs to answer:

- who owns metadata
- what must not be pushed into the edge
- what has to be checked later

Anything not yet decided is recorded as undecided rather than guessed.
