# Machine-facing Edge deployment revision API, and the compact text form.
#
# Structured Workers version metadata for THIS Edge runtime only. Not health.
# Representation is fixed by the URL: application/json, never text/plain or HTML.
# Accept is ignored. Local development may return null fields when the
# version_metadata binding is absent.

GET {{base}}/api/v0/revision.json
HTTP 200
[Asserts]
header "content-type" contains "application/json"
header "content-type" not contains "text/html"
header "content-type" not contains "text/plain"
header "cache-control" contains "no-store"
header "x-robots-tag" == "noindex, nofollow"
header "location" not exists
header "set-cookie" not exists

jsonpath "$.id" exists
jsonpath "$.tag" exists
jsonpath "$.timestamp" exists
jsonpath "$.*" count == 3

jsonpath "$.status" not exists
jsonpath "$.health" not exists
jsonpath "$.rails" not exists
jsonpath "$.title" not exists

body not contains "<html"
body not contains "<!doctype"

GET {{base}}/api/v0/revision.json
Accept: application/json
HTTP 200
[Asserts]
header "content-type" contains "application/json"
header "content-type" not contains "text/html"
jsonpath "$.*" count == 3

GET {{base}}/api/v0/revision.json
Accept: text/html
HTTP 200
[Asserts]
header "content-type" contains "application/json"
header "content-type" not contains "text/html"
jsonpath "$.id" exists

GET {{base}}/api/v0/revision.json
Accept-Language: ja
HTTP 200
[Asserts]
header "content-type" contains "application/json"
header "set-cookie" not exists
jsonpath "$.*" count == 3


# The compact operational representation, `GET /revision`: one text/plain
# token, never JSON or HTML, whatever Accept says. This contract lived in
# e2e/revision.spec.ts until it moved here; it never needed a browser.

GET {{base}}/revision
HTTP 200
[Asserts]
header "content-type" matches /^text\/plain/
header "content-type" not contains "application/json"
header "content-type" not contains "text/html"
header "cache-control" contains "no-store"
header "x-robots-tag" == "noindex, nofollow"
header "location" not exists
header "set-cookie" not exists
# One non-empty token that cannot start a JSON value or an HTML document.
body matches /^[^\s{\[<"]\S*\s*$/

GET {{base}}/revision
Accept: application/json
HTTP 200
[Asserts]
header "content-type" matches /^text\/plain/
body matches /^[^\s{\[<"]\S*\s*$/

GET {{base}}/revision
Accept: text/html
HTTP 200
[Asserts]
header "content-type" matches /^text\/plain/
body matches /^[^\s{\[<"]\S*\s*$/

GET {{base}}/revision
Accept: */*
HTTP 200
[Asserts]
header "content-type" matches /^text\/plain/
body matches /^[^\s{\[<"]\S*\s*$/
