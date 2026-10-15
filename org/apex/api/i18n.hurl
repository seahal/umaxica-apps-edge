# Language negotiation. The detector reads a language cookie but does not write
# one; preference persistence belongs to Rails.
#
# This file exists as its own file on purpose: the explicit Cookie headers
# below make each precedence relationship visible and independent. Folding it
# into `routes.hurl` would make the language cases harder to read beside the
# other shell requests.
#
# The behaviour documented below was NOT visible to the `app.request()` tests
# this replaces. Each `app.request()` call constructs a bare `Request` with an
# empty cookie jar, so every one of them looked like a first-ever visit and
# `Accept-Language` always won. A real client can send a language cookie back,
# and this endpoint reads it; the detector's cache is disabled, so it never
# creates or refreshes one.
#
# `<html lang>` stays pinned to this unit's `defaultLocale` (ja) on every
# response regardless of the negotiated copy: it drives
# `word-break: auto-phrase` in `src/style.css`, which must only run on
# Japanese text.

# 1. A first visit, no cookie. `Accept-Language` decides, and no preference
#    cookie is written.
GET {{base}}/about
Accept-Language: ja
HTTP 200
[Asserts]
xpath "string(//html/@lang)" == "ja"
body contains "このサイトについて"
body not contains "About this site."
header "set-cookie" not exists

# 2. An explicit cookie outranks the header. A visitor who switches their
#    browser language sees no change — `languageDetector` checks querystring,
#    then cookie, then header.
GET {{base}}/about
Accept-Language: en-US,en;q=0.9
Cookie: language=ja
HTTP 200
[Asserts]
body contains "このサイトについて"
body not contains "About this site."

# 3. The querystring outranks the cookie and does not write one. This is the
#    route by which a visitor can choose a different response for one request.
GET {{base}}/about?lang=en
Cookie: language=ja
HTTP 200
[Asserts]
body contains "About this site."
body not contains "このサイトについて"
header "set-cookie" not exists

# 4. An explicit cookie selects the other language too.
GET {{base}}/about
Accept-Language: ja
Cookie: language=en
HTTP 200
[Asserts]
body contains "About this site."

# 5. An unsupported language falls back rather than erroring or echoing.
GET {{base}}/about?lang=de
Accept-Language: ja
HTTP 200
[Asserts]
xpath "string(//html/@lang)" == "ja"
header "set-cookie" not exists
