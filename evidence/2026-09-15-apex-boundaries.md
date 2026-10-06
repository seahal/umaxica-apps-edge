# Apex boundaries — 2026-09-15

P1 covered the five Hono apex units: `app/apex`, `com/apex`, `org/apex`,
`net/apex`, and `dev/apex`.

## Implemented boundary

- Hono language detection still reads the `language` Cookie and
  `Accept-Language`, while `languageDetector({ caches: false })` prevents a
  preference Cookie from being issued or refreshed.
- The apex `/offline` route, offline markup, registration script, Service
  Worker, offline manifest, and related browser references were removed.
- The removed URLs return ordinary HTTP 404 responses in the local contract
  suite. The 404 stylesheet capture remains on the 404 request.
- The apex size check now measures the production Worker bundle at a 52 kB
  gzip limit. The old 502 byte target measured the removed browser files.

## Verification

- Each apex unit: `pnpm run test` passed. Results were 100 tests for
  `app/apex`, `com/apex`, and `org/apex`, and 81 tests for `net/apex` and
  `dev/apex`.
- Each apex unit: local `pnpm run test:api` passed. Results were 78 requests
  for `app/apex`, `com/apex`, and `org/apex`, and 77 requests for `net/apex`
  and `dev/apex`.
- Each apex unit: single-thread `oxfmt --check`, `oxlint`, type-aware
  `oxlint`, `pnpm run knip`, and the Wrangler-backed `pnpm run typecheck`
  passed.
- Each apex unit: `pnpm run build` and `pnpm run check:size` passed. The
  measured Worker bundles were 46.8 to 46.91 kB gzip.

The first local API run exposed a missing stylesheet capture after deleting
the offline page. The capture was moved to the 404 response and the complete
API suites were rerun successfully. The first sandbox attempts for local HTTP,
Wrangler type generation, and parallel format checks were blocked by process,
localhost, or log-directory limits; the checks were rerun with lower
parallelism or the required local execution permission.

Browser e2e, an already registered browser Service Worker, Cloudflare, VPC,
and Rails were not used or changed. Removing these source files does not prove
that a previously controlled browser has already removed its old registration.
