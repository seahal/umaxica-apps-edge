# The three documents a user meets when something is wrong: the 404, the
# offline page, and the server-error splash.
#
# Markup lives in `src/pages/404.astro`, `offline.astro`, and `500.astro`.
# These requests prove those files are actually served on the matching paths
# (unmatched URL, `/offline`, `/500`), not only that the templates exist.

GET {{base}}/__definitely_not_found__
HTTP 404
[Asserts]
header "content-type" matches /^text\/html/
xpath "string(//html/@lang)" == "ja"
xpath "string(//title)" == "ページが見つかりません — UMAXICA (APP)"
xpath "//h1" exists
# A 404 offers a way home. It must not offer a reload — the request will not
# succeed the second time, and telling a user otherwise is the difference
# between the 404 document and the 500 one.
body not contains "再読み込み"

# A nested path proves the handler is global rather than attached to one route.
GET {{base}}/about/definitely/not/here
HTTP 404
[Asserts]
xpath "string(//title)" == "ページが見つかりません — UMAXICA (APP)"


# `/offline` is what the service worker serves from cache when the network is
# gone. It has to be a real, cacheable document served over the network first —
# a service worker cannot cache a route that never answered.
GET {{base}}/offline
HTTP 200
[Asserts]
header "content-type" matches /^text\/html/
xpath "string(//html/@lang)" == "ja"
xpath "string(//title)" == "オフライン — UMAXICA (APP)"
xpath "//h1" exists

# `/500` is the server-error splash. Reload is forbidden (a herd of retries
# would load a failing origin). Recovery is a different host.
GET {{base}}/500
HTTP *
[Asserts]
header "content-type" matches /^text\/html/
xpath "string(//html/@lang)" == "ja"
xpath "string(//title)" == "サーバーエラー — UMAXICA (APP)"
xpath "//h1" exists
body contains "稼働状況を見る"
body contains "https://status.umaxica.dev/"
body not contains "再読み込み"

# A real CMS route is disabled in local mode because no VPC binding is configured.
# This proves the outward configuration-failure response without fabricating CMS data.
GET {{base}}/ja/cms-pilot-probe
HTTP 500
[Asserts]
header "content-type" matches /^text\/html/
header "cache-control" == "no-store"
header "x-robots-tag" contains "noindex"
body contains "Unable to display this page"
body not contains "UMAXICA_APPS_EDGE_CF_WORKERS_VPC"
body not contains "docs.app.localhost"
