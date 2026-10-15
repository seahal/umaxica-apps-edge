# Rails-owned path ownership, asserted over real HTTP.
#
# These are response-level facts — status codes on Rails-owned paths — so they
# belong here and not in a `.test.ts`.
#
# No tier declares `RAILS_ORIGIN`, so a dispatch that reaches the upstream answers
# 503 by design (`adr/018-core-rails-direct-internet.md`). That is what makes
# these assertions work at all: 503 means "Edge classified this path as
# Rails-owned and tried", which is precisely what separates a Rails-owned path
# from an application-owned one, over the wire, without a Rails to talk to.
#
# The 8 MiB body ceiling is deliberately NOT asserted here. Exercising it needs
# either a forged `Content-Length` — which no HTTP client will send, because curl
# computes the header from the body it has — or an 8 MiB fixture in the repository.
# It is covered in `test/lib/rails-body-limit.test.ts` and
# `test/core-dispatch.test.ts` instead, which is the placement rule in
# `AGENTS.md`: an assertion no HTTP client can produce belongs in Vitest.
# `docs/development/edge-rails-proxy-trust-boundary.md` §2 records the same.

# --- Logout: all four spellings reach the Rails branch ------------------------
#
# The point of the pair. `/sign/out/` used to fall through to the application,
# which renders a page and cannot clear a Rails session — so a user who opened
# the trailing-slash URL kept their session cookie. ADR 023 §1.

GET {{base}}/sign/out
HTTP 503

GET {{base}}/sign/out/
HTTP 503

GET {{base}}/sign/out/complete
HTTP 503

GET {{base}}/sign/out/complete/
HTTP 503

# --- and the near-misses do not ----------------------------------------------
#
# The ownership table is an exact-match allow-list. A prefix rule would sweep all
# of these into Rails; anything but 503 proves it did not.

GET {{base}}/sign/outside
[Options]
location: false
HTTP *
[Asserts]
status != 503

GET {{base}}/sign/out/other
[Options]
location: false
HTTP *
[Asserts]
status != 503

GET {{base}}/sign/out/complete/extra
[Options]
location: false
HTTP *
[Asserts]
status != 503

# The canonical URIs keep one spelling each: no trailing-slash alias was added,
# so these stay application-owned.
GET {{base}}/csp-violation-report/
[Options]
location: false
HTTP *
[Asserts]
status != 503

GET {{base}}/.well-known/jwks.json/
[Options]
location: false
HTTP *
[Asserts]
status != 503
