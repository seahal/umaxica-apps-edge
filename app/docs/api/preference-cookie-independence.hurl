# Existing path and root negotiation stay independent of preference cookies.
GET {{base}}/
Accept-Language: en
Cookie: language=ja
HTTP 302
[Asserts]
header "location" endsWith "/en/"

GET {{base}}/
Accept-Language: ja
Cookie: language=en
HTTP 302
[Asserts]
header "location" endsWith "/ja/"

GET {{base}}/ja/
Cookie: language=en
HTTP 200
[Asserts]
xpath "string(//html/@lang)" == "ja"
xpath "string(//link[@rel='canonical']/@href)" endsWith "/ja/"
xpath "string(//link[@rel='alternate'][@hreflang='en']/@href)" endsWith "/en/"
xpath "string(//link[@rel='alternate'][@hreflang='x-default']/@href)" endsWith "/ja/"

GET {{base}}/en/
Cookie: language=ja
HTTP 200
[Asserts]
xpath "string(//html/@lang)" == "en"
xpath "string(//link[@rel='canonical']/@href)" endsWith "/en/"
xpath "string(//link[@rel='alternate'][@hreflang='ja']/@href)" endsWith "/ja/"
