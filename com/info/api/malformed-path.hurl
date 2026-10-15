# A path with invalid percent-encoding is a 400 from TanStack Start, and it
# must still leave through the request boundary, with security headers and a
# request id. Since Start 1.169, `createServerEntry` answered it before the
# boundary ran, with none of these (see src/server.ts).

GET {{base}}/%E0%A4%A
HTTP 400
[Asserts]
header "x-request-id" exists
header "content-security-policy" exists
header "x-content-type-options" == "nosniff"

GET {{base}}/en/%E0%A4%A
HTTP 400
[Asserts]
header "x-request-id" exists
header "content-security-policy" exists
header "x-content-type-options" == "nosniff"
