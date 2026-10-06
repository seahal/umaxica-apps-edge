# Request-local CSP nonce isolation, under concurrency, in the real runtime.
#
# This file is run on its own by `api/run.mjs`, repeated and in parallel
# (`--repeat` with `--jobs`), against the BUILT Worker served by workerd. It is
# the one check in this unit whose subject is the runtime rather than the code:
# the nonce in the `Content-Security-Policy` header comes from a local variable
# in `src/lib/app-request.ts`, while the nonce the router stamps on the document
# is read back from the request-local AsyncLocalStorage store
# (`src/security-nonce-als.ts`). The two can only agree, on every one of many
# overlapping requests, if that store really is per request in workerd.
#
# A unit test cannot say this. Under Vitest the store is Node's, requests do not
# overlap, and a store that leaked between concurrent requests would still pass.
#
# The assertion is deliberately within ONE response. A leak shows up as a
# document carrying another request's nonce — which the browser would then
# refuse to execute — so header and body disagreeing is the failure itself.

GET {{base}}/
HTTP 200
[Captures]
nonce: header "content-security-policy" regex "script-src 'self' 'nonce-([A-Za-z0-9+/=]+)'"
[Asserts]
xpath "string(//meta[@property='csp-nonce']/@content)" == "{{nonce}}"
xpath "count(//script[@nonce])" > 0
xpath "count(//script[@nonce != '{{nonce}}'])" == 0
xpath "count(//link[@nonce != '{{nonce}}'])" == 0
