# Plan 004: Happy-Path Status Code Coverage for All GET Routes

## Status: Pending

## GitHub Issue

TBD — open after this plan is reviewed.

## Problem

Recent regressions in Next.js pages went undetected because nothing asserted that GET routes return a successful response on the happy path. A current audit shows:

| Surface                         | Endpoints | Status-200 Asserted | Gap |
| ------------------------------- | --------- | ------------------- | --- |
| Hono apex GET routes            | 12        | 12                  | 0   |
| Next.js `route.ts` GET handlers | 7         | 4                   | 3   |
| Next.js `page.tsx` (App Router) | 50        | 0 (1 partial)       | 50  |

**Hono — fully covered.** Tests use `app.request('/path')` and assert `res.status === 200`:

- `app/apex/test/routes/{health,root,about}-route.test.ts`
- `com/apex/test/{health,root,about}-route.test.ts`
- `org/apex/test/{health,root,about}-route.test.ts`
- `net/apex/test/app.test.tsx` (covers all three)

**Next.js route handlers — `/health` is covered, `/api/image` is not.**

- Covered: `app/core/test/routes/health.test.ts` (and com/org/dev equivalents)
- Missing: `app/core/src/app/api/image/route.ts` (and com/org equivalents) — three handlers, no test asserts a 200 path.

**Next.js pages — essentially unverified.**

- `app/core/src/app/(page)/**/page.tsx` × 11 (and com/org with same shape) → 33 pages, 0 tests asserting render success
- `dev/core/src/app/page.tsx` → 1 page, untested
- `{app,com,org}/{docs,help,news}/src/app/page.tsx` and `[locale]/page.tsx` → 18 pages, untested
- Only `app/core/test/rails-health.test.tsx` exists, and it tests the inner `RailsHealthView`, not the page entrypoint.

## Goals

1. Every Next.js `route.ts` GET handler has a unit test asserting `response.status === 200` for the happy path.
2. Every Next.js `page.tsx` has a smoke test that imports the page component and asserts it renders to non-empty HTML without throwing — the unit-level proxy for "the SSR response will be 200."
3. CI fails if any GET route is added without a corresponding status-200 assertion.

## Non-Goals

- Detailed body-content assertions (covered by existing per-component tests).
- Authenticated or parameterized GET routes that don't currently exist.
- True end-to-end testing through a running dev server / Workers runtime — out of scope for this plan.
- Hono apex tests (already covered; only **verify** during implementation, do not modify).

## Approach

### Pattern A — Hono routes (already covered, verify only)

```ts
import app from '../src/app';
const res = await app.request('/health');
expect(res.status).toBe(200);
```

No changes. Implementer must run `vp test` and confirm all 12 Hono GET assertions still pass.

### Pattern B — Next.js `route.ts` handlers (3 new tests)

Use the existing health-route test as a template (`app/core/test/routes/health.test.ts`). For `/api/image`, the handler reads `searchParams`, validates the URL, fetches the source, then either uses the `IMAGES` binding or falls back to passthrough. The simplest 200-path test stubs `fetch` and leaves `env.IMAGES` undefined so the fallback path returns the source body with status 200.

Template:

```ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/image/route';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn().mockReturnValue({ env: {} }),
}));

describe('app/core /api/image GET', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('returns 200 on the happy path (fallback when IMAGES binding is absent)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    );

    const request = new NextRequest(
      'https://app.umaxica.app/api/image?url=https%3A%2F%2Fexample.com%2Fa.png&w=100&q=80',
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

The implementer must check `shared/cloudflare/image.ts` for the allowed-host list and pick a URL that passes `isAllowedImageFetchTarget`. If no real domain works, set `process.env.ALLOWED_IMAGE_HOSTS = 'example.com'` for the test.

### Pattern C — Next.js `page.tsx` smoke tests (recommended approach)

Pages are React Server Components; they don't directly return a `Response`. Next.js renders them and returns 200 if rendering succeeds, 500 if the component throws. The unit-level proxy is **render-and-don't-throw**:

```ts
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import HomePage from '../src/app/(page)/page';

describe('app/core pages render without throwing', () => {
  it('home page renders', async () => {
    // Async server components: await before passing to renderToStaticMarkup
    const element = await HomePage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });
});
```

For pages with route params (e.g. `[locale]/page.tsx` in Next.js 16), pass async params:

```ts
const element = await Page({ params: Promise.resolve({ locale: 'en' }) });
```

For pages that fetch external resources (e.g. `rails-health/page.tsx` calls Rails), stub `fetch` like `app/core/test/rails-health.test.tsx` already does.

For pages that read CF bindings, mock `@opennextjs/cloudflare` like the health-route test does.

### Coverage Plan — File Inventory

#### Add: route handler tests

| File                                     | Covers                                |
| ---------------------------------------- | ------------------------------------- |
| `app/core/test/routes/api-image.test.ts` | `app/core/src/app/api/image/route.ts` |
| `com/core/test/routes/api-image.test.ts` | `com/core/src/app/api/image/route.ts` |
| `org/core/test/routes/api-image.test.ts` | `org/core/src/app/api/image/route.ts` |

#### Add: page smoke tests (one file per workspace, with one `it` per page)

| File                                 | Pages covered                                                     |
| ------------------------------------ | ----------------------------------------------------------------- |
| `app/core/test/pages-smoke.test.tsx` | 11 pages under `app/core/src/app/(page)/**/page.tsx`              |
| `com/core/test/pages-smoke.test.tsx` | 11 pages under `com/core/src/app/(page)/**/page.tsx`              |
| `org/core/test/pages-smoke.test.tsx` | 11 pages under `org/core/src/app/(page)/**/page.tsx`              |
| `dev/core/test/pages-smoke.test.tsx` | `dev/core/src/app/page.tsx` (1 page)                              |
| `app/docs/test/pages-smoke.test.tsx` | `app/docs/src/app/page.tsx`, `app/docs/src/app/[locale]/page.tsx` |
| `app/help/test/pages-smoke.test.tsx` | `app/help/src/app/page.tsx`, `app/help/src/app/[locale]/page.tsx` |
| `app/news/test/pages-smoke.test.tsx` | `app/news/src/app/page.tsx`, `app/news/src/app/[locale]/page.tsx` |
| `com/docs/test/pages-smoke.test.tsx` | same shape (2 pages)                                              |
| `com/help/test/pages-smoke.test.tsx` | same shape (2 pages)                                              |
| `com/news/test/pages-smoke.test.tsx` | same shape (2 pages)                                              |
| `org/docs/test/pages-smoke.test.tsx` | same shape (2 pages)                                              |
| `org/help/test/pages-smoke.test.tsx` | same shape (2 pages)                                              |
| `org/news/test/pages-smoke.test.tsx` | same shape (2 pages)                                              |

Total new files: **3 route-handler tests + 13 page-smoke tests = 16**.

For the 11 `core` pages per domain, the page list is identical and known:

```
(page)/page.tsx                              → root
(page)/about/page.tsx
(page)/explore/page.tsx
(page)/doctor/page.tsx
(page)/notifications/page.tsx
(page)/messages/page.tsx
(page)/configuration/page.tsx
(page)/configuration/account/page.tsx
(page)/configuration/preference/page.tsx
(page)/home/page.tsx
(page)/rails-health/page.tsx                 (mock fetch)
```

### Pattern D — CI guard (optional, post-merge cleanup)

Add a small lint/script that walks `**/page.tsx` and `**/route.ts` and confirms each has a corresponding `*.test.{ts,tsx}` assertion. Out of scope for the first PR; track as a follow-up.

## Files to Change

### Add (16 files)

See "Coverage Plan — File Inventory" above.

### Update

- `plans/README.md` — add this plan under "Active Plans".

### Do NOT modify

- `vitest.config.ts`, `.oxlintrc.json`, `tsconfig.json`, `oxfmt` config — per CLAUDE.md, configs for these tools require explicit user permission.
- Existing Hono apex tests.
- Existing Next.js health route tests.

## Tests

- All new tests must pass `vp test` (`pnpm test` in CI).
- New tests must explicitly assert either `expect(response.status).toBe(200)` (route handlers) or `expect(html).not.toBe('')` after a successful render (pages).
- The repo's 100% coverage threshold must continue to pass — the new smoke tests will help, not hurt.

## Acceptance Criteria

1. The 3 `/api/image` route handlers each have a test asserting `response.status === 200` on the happy path.
2. All 50 `page.tsx` files have a smoke test that imports and renders them (with appropriate mocks for fetch / CF bindings / Sentry).
3. `vp test` passes locally and in CI on a branch.
4. `vp check` (format + lint + type) passes.
5. PR description lists every page covered, grouped by workspace.
6. After merge, this plan is moved to `/adr/004-...md` with an `## Outcome` section.

## Risks / Open Questions

- **`getCloudflareContext()`** — Some pages may indirectly read CF bindings. Reuse the mock pattern from `app/core/test/routes/health.test.ts`. If a page imports it transitively, mock at the top of the test file.
- **Sentry** — `app/core/__mocks__/@sentry/react-router.ts` already stubs Sentry for `app/core`. Confirm `vitest.config.ts` aliases it for tests; if other workspaces need a similar stub, add one **only if a test surfaces the need**.
- **Async params** — Next.js 16 makes `params` a `Promise`. All `[locale]` page tests must pass `params: Promise.resolve({ locale: 'en' })`.
- **i18n / locale** — Smoke tests should at minimum cover `en`. Adding `ja` per page is optional; recommended for `[locale]/page.tsx` pages where the locale changes the rendered content.
- **`/api/image` allowed hosts** — `validateImageUrl` and `isAllowedImageFetchTarget` reject unknown hosts. The implementer must read `shared/cloudflare/image.ts` and either pick a URL that satisfies `DEFAULT_ALLOWED_IMAGE_HOSTS` or set `process.env.ALLOWED_IMAGE_HOSTS` in the test.
- **Failure domain** — If a page imports a module that throws at import time (e.g., a missing env var), the smoke test will catch it — that's the point. Investigate the root cause rather than wrapping in try/catch.

## Out of Scope (Follow-up Tickets)

- Integration tests via a running Workers / dev server (Pattern D would replace this).
- Lint rule enforcing every new `page.tsx` / `route.ts` ships with a test.
- POST/PUT/DELETE route coverage (audit only covered GET).
