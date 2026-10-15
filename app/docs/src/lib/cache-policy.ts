/*
 * Every `Cache-Control` value this unit's HTML routes send, in one file.
 *
 * The explicit public cache scope is deliberately ONE route:
 * `/{lang}/entries/{public_id}/`, and only when it rendered an Entry. Home, the
 * entry collection, its pagination and search carry no cache strategy in this
 * phase (docs/caching-and-isr.md); the collection keeps the `no-store` it has
 * always sent, and every failure document is `no-store` so an outage is never
 * remembered.
 *
 * These are HTTP cache directives for browsers and shared HTTP caches, whose key
 * is the full request URL: the host (one cell per hostname), the locale (first
 * path segment) and the `public_id` (last path segment). Nothing here varies on
 * a header.
 *
 * Workers Cache is a different store with a different key — path, entrypoint,
 * `ctx.props` and Worker version, NOT the hostname — and it is intentionally
 * disabled in `wrangler.jsonc` (`cache.enabled: false`). Nothing in this file
 * is a statement about it; see docs/caching-and-isr.md before re-enabling.
 *
 * Change the TTL here and nowhere else.
 */
export const ENTRY_CACHE_TTL_SECONDS = 60;

export const ENTRY_CACHE_CONTROL = `public, max-age=${String(ENTRY_CACHE_TTL_SECONDS)}, s-maxage=${String(ENTRY_CACHE_TTL_SECONDS)}`;

export const NO_STORE = 'no-store';
