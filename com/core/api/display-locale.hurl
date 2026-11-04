# URL-only SSR locale; preference cookies and forged internal headers are ignored.

GET {{base}}/?lx=en
x-edge-display-locale: en
HTTP 200
[Asserts]
header "set-cookie" not exists
xpath "string(//html/@lang)" == "en"

GET {{base}}/?lx=ja
x-edge-display-locale: en
HTTP 200
[Asserts]
header "set-cookie" not exists
xpath "string(//html/@lang)" == "ja"

GET {{base}}/?lx=EN
x-edge-display-locale: en
HTTP 200
[Asserts]
header "set-cookie" not exists
xpath "string(//html/@lang)" == "en"

GET {{base}}/?lx=invalid
Cookie: language=en
x-edge-display-locale: en
HTTP 200
[Asserts]
header "set-cookie" not exists
xpath "string(//html/@lang)" == "ja"

GET {{base}}/?lx=en&lx=ja
x-edge-display-locale: en
HTTP 200
[Asserts]
header "set-cookie" not exists
xpath "string(//html/@lang)" == "ja"

GET {{base}}/
Cookie: language=en
x-edge-display-locale: en
HTTP 200
[Asserts]
header "set-cookie" not exists
xpath "string(//html/@lang)" == "ja"

GET {{base}}/?lx=ja
Cookie: language=en
x-edge-display-locale: en
HTTP 200
[Asserts]
header "set-cookie" not exists
xpath "string(//html/@lang)" == "ja"

GET {{base}}/
Cookie: language=%broken; language=en
x-edge-display-locale: en
HTTP 200
[Asserts]
header "set-cookie" not exists
xpath "string(//html/@lang)" == "ja"

