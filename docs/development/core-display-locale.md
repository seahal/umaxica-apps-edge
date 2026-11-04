# Core display locale

Core resolves display language only from the last scalar `lx` URL parameter.
Values are lowercased and validated against the existing `ja` / `en` locales.
Missing, empty, invalid and bracketed parameters use the existing `ja` default.
Preference `language` Cookies have no effect, including on rate-limit documents.

The Worker overwrites `x-edge-display-locale` with the validated URL result and
removes the entire inbound Cookie before invoking TanStack. Application responses
lose every Set-Cookie. Server Paraglide validates the internal locale value;
client Paraglide reads the document's HTML lang to preserve hydration alignment.
Rails-owned dispatch retains its existing Cookie and CSRF forwarding boundary.

Docs, Help, Info and News use `/ja/` and `/en/` paths. Their root continues to
negotiate Accept-Language. Canonical and hreflang remain path-based.
No replacement Preference storage, fallback, API or synchronization is added.
The dev/net Hono apex detectors retain their existing separate contract.
