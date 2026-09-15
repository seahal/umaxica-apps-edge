# The security header contract.
#
# This replaces `test/security-headers.test.ts`, which asserted the same header
# values against a throwaway `new Hono()` that mounted the middleware and
# nothing else. That test could only ever prove `secureHeaders()` echoes its own
# configuration back — it shared no code path with the app, so it stayed green
# through any mistake in `create-apex-app.ts` that dropped or reordered the
# middleware. Asserting on a real response closes that gap.
#
# Headers are checked on `/health` rather than `/`, because `/` is a 301 and the
# question here is what a served document carries.

GET {{base}}/health
HTTP 200
[Asserts]
header "x-request-id" matches /^[0-9a-f-]{36}$/
header "strict-transport-security" contains "max-age=31536000"
header "strict-transport-security" contains "includeSubDomains"
header "strict-transport-security" contains "preload"
header "x-content-type-options" == "nosniff"
header "x-frame-options" == "DENY"
header "referrer-policy" == "no-referrer"
header "content-security-policy" contains "default-src 'self'"
header "content-security-policy" contains "base-uri 'self'"
header "content-security-policy" contains "object-src 'none'"
header "content-security-policy" contains "script-src 'self'"
header "content-security-policy" contains "script-src-attr 'none'"
header "content-security-policy" contains "frame-ancestors 'none'"
header "content-security-policy" contains "form-action 'self'"
header "content-security-policy" contains "upgrade-insecure-requests"
# `style-src` is 'self' alone. It used to carry a sha256 of an inline <style>
# alongside 'self', which bought nothing — 'self' already permitted a
# same-origin stylesheet — while forcing the digest to be recomputed by hand on
# every CSS change. The stylesheet is a compiled static asset now, so the
# narrower policy is the correct one and no digest may reappear.
header "content-security-policy" contains "style-src 'self';"
header "content-security-policy" not contains "sha256-"
# Forbids inline `style="…"`, which is why every visual rule in this unit is a
# Tailwind class rather than an attribute.
header "content-security-policy" contains "style-src-attr 'none'"
header "permissions-policy" contains "accelerometer=()"
header "permissions-policy" contains "camera=()"
header "permissions-policy" contains "geolocation=()"
header "permissions-policy" contains "microphone=()"
header "permissions-policy" contains "payment=()"
header "permissions-policy" contains "usb=()"


# The headers are applied with `app.use('*', …)`, so they must survive the error
# path too — a 404 that answers without a CSP is the case a happy-path-only
# assertion misses.
GET {{base}}/__definitely_not_found__
HTTP 404
[Asserts]
header "x-request-id" matches /^[0-9a-f-]{36}$/
header "content-security-policy" contains "default-src 'self'"
header "x-frame-options" == "DENY"
header "x-content-type-options" == "nosniff"
