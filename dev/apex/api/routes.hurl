# The routed surfaces: the homepage and /about.
#
# Replaces the routing half of `test/app.test.tsx`, which drove the whole
# surface through `app.request()`. The routing decision — which status, which
# document — is only observable over HTTP.
#
# This unit is a NET-series apex: it owns a domain and answers its own root
# with a page. It is not a redirector. `umaxica.dev` has no per-region hosts
# and no `src/root-redirect.ts`, so unlike the COM-series apexes there is no
# `?ri=` allowlist and no request-supplied value that can reach a `Location`
# header at all. That absence is the point of this comment — a future `?ri=`
# on this unit needs the app/apex file's open-redirect checks brought with it.

# The homepage. 200 and a document, NOT a redirect: `/` used to 301 to
# `/about`, which left the domain with no canonical page of its own.
GET {{base}}/
HTTP 200
[Asserts]
header "content-type" matches /^text\/html/
xpath "normalize-space(//main//h1)" == "umaxica.dev"
xpath "string(//link[@rel='canonical']/@href)" == "https://umaxica.dev/"
# The bare brand: the homepage is the site, not a page within it.
xpath "string(//title)" == "UMAXICA (DEV)"


# `/` must not redirect anywhere, and a query string must not turn it into a
# redirect either. Hurl follows no redirect unless asked, so a 301 regression
# fails the status assertion above; these pin that nothing supplies a Location.
GET {{base}}/
HTTP 200
[Asserts]
header "location" not exists

GET {{base}}/?ri=us
HTTP 200
[Asserts]
header "location" not exists
xpath "normalize-space(//main//h1)" == "umaxica.dev"

GET {{base}}/?ri=https://evil.example.com
HTTP 200
[Asserts]
header "location" not exists
xpath "normalize-space(//main//h1)" == "umaxica.dev"


# `/about` remains its own page. The homepage did not replace it and must not
# redirect to it — they carry different canonical URLs on purpose.
GET {{base}}/about
HTTP 200
[Asserts]
header "location" not exists
xpath "string(//link[@rel='canonical']/@href)" == "https://umaxica.dev/about"


# Security headers are on the homepage like any other response.
GET {{base}}/
HTTP 200
[Asserts]
header "strict-transport-security" contains "max-age=31536000"
header "content-security-policy" contains "default-src 'self'"
header "permissions-policy" contains "accelerometer=()"
header "x-frame-options" == "DENY"
header "referrer-policy" == "no-referrer"


# /about is the one rendered page this unit serves. It goes through the JSX
# renderer, so it carries the full shell: favicon, stylesheet, the SEO head and
# the title contract.
GET {{base}}/about
HTTP 200
[Asserts]
header "content-type" matches /^text\/html/
xpath "string(//html/@lang)" == "ja"
# The UMAXICA title contract is `{PAGE} — UMAXICA ({TLD})` with an EM DASH:
# the page name leads and the brand closes.
xpath "string(//title)" == "About — UMAXICA (DEV)"
xpath "string(//meta[@name='description']/@content)" == "umaxica.dev is a UMAXICA platform domain. Services and content are available on dedicated subdomains"
xpath "string(//link[@rel='canonical']/@href)" == "https://umaxica.dev/about"
xpath "string(//meta[@name='robots']/@content)" == "index,follow"
xpath "string(//meta[@name='twitter:card']/@content)" == "summary_large_image"
xpath "//link[@rel='icon'][@href='/favicon.ico']" exists
xpath "count(//link[@rel='stylesheet'])" == 1
xpath "string(//link[@rel='stylesheet']/@href)" matches /^\/[^"]+\.css(\?[^"]*)?$/
xpath "//head" exists
xpath "//body" exists
xpath "//main" exists
# The title must never name the runtime or the surface that served it.
xpath "string(//title)" not contains "apex"
xpath "string(//title)" not contains "Hono"
xpath "string(//title)" not contains "Workers"
