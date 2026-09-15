# The routed surfaces: the apex redirect and /about.
#
# Replaces the `app.request()` bodies of `test/root-route.test.ts`,
# `test/about-route.test.ts`, `test/health-route.test.ts` and the
# shared `test/utils/request.ts` helper. The routing decision — which status,
# which Location, which document — is only observable over HTTP; the pure part
# (`resolveRedirectUrl`) keeps its own unit test in `test/root-redirect.test.ts`.

# The apex root is a redirect, never a document. `[Options] location: false` is
# the default, but the assertion below only means anything if the redirect is
# not followed, so the intent is worth stating.
GET {{base}}/
HTTP 301
[Asserts]
header "location" == "https://jp.umaxica.com/"


# `?ri=` selects the region. Matching is case-insensitive by way of
# `toLowerCase()`, and an unknown region falls back to the default rather than
# erroring — the 400 branch that used to sit here was unreachable.
GET {{base}}/?ri=us
HTTP 301
[Asserts]
header "location" == "https://us.umaxica.com/"

GET {{base}}/?ri=JP
HTTP 301
[Asserts]
header "location" == "https://jp.umaxica.com/"

GET {{base}}/?ri=atlantis
HTTP 301
[Asserts]
header "location" == "https://jp.umaxica.com/"


# Open-redirect protection at the route. The allowlist itself is exercised
# exhaustively in `test/root-redirect.test.ts`; what these two add is that a
# hostile `ri` cannot reach `Location` through URL parsing, percent-decoding or
# header handling that happens between the network and that function — layers
# the unit test does not go through.
GET {{base}}/?ri=jp.evil.com
HTTP 301
[Asserts]
header "location" == "https://jp.umaxica.com/"

GET {{base}}/?ri=jp%2eevil%2ecom
HTTP 301
[Asserts]
header "location" == "https://jp.umaxica.com/"


# Security headers are on the redirect too — it is a response like any other.
GET {{base}}/
HTTP 301
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
xpath "string(//title)" == "About — UMAXICA (COM)"
xpath "string(//meta[@name='description']/@content)" == "umaxica.com is a UMAXICA platform domain. Services and content are available on dedicated subdomains"
xpath "string(//link[@rel='canonical']/@href)" == "https://umaxica.com/about"
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
