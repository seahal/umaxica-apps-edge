# Origin-based CSRF rejection.
#
# `hono/csrf` guards state-changing methods by comparing the `Origin` header
# against `isAllowedApexOrigin`. The predicate itself is pure and stays in
# `test/csrf.test.ts`; what belongs here is that the middleware is actually
# mounted in `create-apex-app.ts` and actually rejects — the old test built its
# own `new Hono()`, so it proved the former and not the latter.
#
# Note the origins below are the point of the file: the server under test is
# reached at `http://localhost:5301`, which is NOT an allowed origin
# (`org.localhost` is). A cross-origin POST must be refused even though it comes
# from the same host the suite is talking to.

POST {{base}}/about
Origin: https://evil.example.com
HTTP 403
[Asserts]
# The security headers are applied with `app.use('*', …)` ahead of the CSRF
# middleware, so a rejection must still carry them. A rejected request that
# answers without a CSP is a rejection an attacker can frame.
header "content-security-policy" contains "default-src 'self'"
header "x-content-type-options" == "nosniff"
header "x-frame-options" == "DENY"

POST {{base}}/about
Origin: http://localhost:5301
HTTP 403

# A lookalike that must not pass the `^https://umaxica\.org$` anchor — a
# substring match here would be a real vulnerability.
POST {{base}}/about
Origin: https://umaxica.org.evil.example.com
HTTP 403

# A sibling UMAXICA apex. These are separate sites and this worker has no
# reason to accept a form posted from one; the predicate used to be shared
# verbatim across all five units and allowed every one of them.
POST {{base}}/about
Origin: https://umaxica.com
HTTP 403

# The local development origin clears the check on this tier (`EDGE_ENV` is
# `development` under `pnpm run dev`), so it fails on routing — no POST handler
# on /about — rather than on CSRF. A 403 here would mean the allowlist had
# regressed. On production `allowLocalhost` is false and this origin is refused.
POST {{base}}/about
Origin: http://org.localhost:5301
HTTP 404

# Safe methods are never challenged.
GET {{base}}/about
Origin: https://evil.example.com
HTTP 200
