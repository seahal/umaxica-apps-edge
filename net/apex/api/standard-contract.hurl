# The standard URL contract every UMAXICA deployment unit serves.
#
# Moved out of `e2e/standard-contract.spec.ts`, where it ran through
# Playwright's `APIRequestContext`. Nothing in it needed a browser: it started a
# Chromium, an OS window and a page context in order to make nine HTTP requests
# and read their status lines. Here it is the HTTP contract.
#
# Browser-only assertions remain in the e2e suites where a real browser is
# required.

GET {{base}}/robots.txt
HTTP 200
[Asserts]
header "content-type" matches /^text\/plain/
body contains "User-agent:"

GET {{base}}/sitemap.xml
HTTP 200
[Asserts]
header "content-type" matches /xml/
xpath "//*[local-name()='urlset']" exists

GET {{base}}/favicon.ico
HTTP 200

GET {{base}}/health
HTTP 200

GET {{base}}/revision
HTTP 200

# Apex no longer exposes its removed offline browser surfaces. The status is
# intentionally a normal 404 so a browser cannot register or use stale code.
GET {{base}}/manifest.webmanifest
HTTP 404

GET {{base}}/service-worker-register.js
HTTP 404

GET {{base}}/service-worker.js
HTTP 404

GET {{base}}/offline
HTTP 404

GET {{base}}/__definitely_not_found__
HTTP 404
