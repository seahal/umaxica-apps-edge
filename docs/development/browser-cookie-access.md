# Browser-side cookie access

This file is normative on one narrow question: **when code running in a browser
has to read or write a cookie, what does it use?** The answer is the Cookie
Store API — the global `cookieStore` — and nothing else. No cookie library, and
not `document.cookie`.

It does not choose a browser API for server code. The current Edge contract is
recorded below where it deliberately disables Edge-owned preference writes.

## 1. What exists today

Nothing in a browser touches a cookie in this repository. That is not an
oversight, it is the current architecture, and it is worth stating precisely so
the next reader does not go looking for the module this file is about:

- **No cookie library is a dependency of any unit.** All twenty workspaces
  declare `hono` or `@tanstack/react-start`, `react`, `react-aria-components`
  and `react-dom` — and no cookie package. The `cookie`, `cookie-signature` and `tough-cookie` entries in
  `pnpm-lock.yaml` arrive transitively through devDependencies — `express` and
  `jsdom` among them — and none reaches a browser bundle.
- **`document.cookie` appears nowhere**, and neither does `localStorage` or
  `sessionStorage`. The client components that exist — `status-documents.tsx`,
  `service-worker-registration.tsx`, `app-chrome.tsx` — read no storage of any
  kind.
- **Edge does not write a preference cookie.** The apex workers still _read_
  `language` through Hono's `languageDetector` and _read_ `theme` in
  `src/theme.ts`, but every detector is mounted with `caches: false`, so the
  request does not refresh, set or delete `language`. `*/apex/api/i18n.hurl`
  pins the querystring → cookie → `Accept-Language` precedence and the absence
  of `Set-Cookie`. Rails remains the preference-cookie writer under the
  current contract.
- **The Core workers delete cookies in both directions on the frame-owned path.**
  `{app,com,org}/core/src/worker.ts` strips `cookie` from the request before the
  frame sees it and `set-cookie` from the response before the browser does;
  `*/src/lib/rails-client.ts` strips `cookie` from every server-to-server call.
  ADR 007 is normative on why.

So there is no library here to remove and no `document.cookie` call to rewrite.
This file is not a migration; it is the decision taken **before** the first
browser-side cookie is written, so that it is taken once rather than per feature.

## 2. The rule

Browser code that must read or write a cookie uses the global `cookieStore`
directly.

Adding a cookie library to any unit's dependencies is not allowed, and neither is
`document.cookie`. Three reasons, and they are the whole justification:

- **It does not block.** Every `cookieStore` method returns a promise;
  `document.cookie` is a synchronous main-thread property access, and a library
  wrapping it cannot make it otherwise.
- **It returns structure.** `get()` and `getAll()` yield `CookieListItem`
  objects with `name`, `value`, `domain`, `path`, `expires`, `secure` and
  `sameSite` as fields. The reason cookie libraries exist at all is that
  `document.cookie` is one flat string that has to be parsed; there is nothing
  left for a library to do here.
- **It costs no bytes.** The browser-bundle budgets in each unit's
  `.size-limit.json` are baseline + 10%, tight enough that a stray dependency
  fails the gate. A platform API spends none of that budget.

The same API is reachable from a service worker as
`ServiceWorkerGlobalScope.cookieStore`, and a `change` event is available in both
scopes — so a cookie can be observed rather than polled.

## 3. What this rule does not change

The browser API rule does not replace server-side cookie parsing. Hono's
`languageDetector` keeps its existing read order, while `caches: false` keeps
the Edge from writing preference cookies. Any future server-side cookie access
inside a frame and every cookie Rails sets or reads remain server concerns. The
current contract permits Rails to issue preference cookies; Edge-owned browser
preference saving is disabled.

ADR 007's cookie boundary also stands, and it has a consequence that is easy to
walk into:

> **A cookie that browser JavaScript can see cannot be issued by a frame.**

`{app,com,org}/core/src/worker.ts` deletes every `Set-Cookie` from the
frame-owned response, and `Headers.delete()` in Workers removes all values, not
the first. A server route or server function that sets a cookie will appear to
work locally and emit nothing through the Worker. Rails is the only preference-
cookie writer. Rails-owned path prefixes listed in ADR 007 may preserve its
`Set-Cookie`; the apex workers can read display preferences, but they do not
issue, refresh or delete them.

## 4. What an implementer will hit

Five constraints, all of which bite on the first attempt. None is avoidable by
choosing a different client-side API — the first three are properties of cookies
themselves.

| Constraint                             | What it means here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`HttpOnly` is invisible**            | Exactly as with `document.cookie`. `language` is `HttpOnly`, so a client-side language switcher cannot read or write it — use the `?lang=` querystring, which `i18n.hurl` documents as the route that outranks the cookie. Dropping `HttpOnly` to make it readable is a change to the contract in `*/apex/api/i18n.hurl` and a separate decision, not an implementation detail.                                                                                                                                |
| **Secure context only**                | The API is unavailable over plain HTTP. `localhost` counts as secure, and every deployed surface is HTTPS, so this constrains only ad-hoc testing over a non-loopback HTTP origin.                                                                                                                                                                                                                                                                                                                             |
| **Everything is async**                | `get`, `getAll`, `set` and `delete` all return promises. A cookie cannot be read during render to decide initial markup; it belongs in an effect or an event handler, which means the server-rendered HTML must already be correct without it.                                                                                                                                                                                                                                                                 |
| **Support is newer than our floor**    | The Cookie Store API is Baseline 2025 — Chrome 87, Safari 18.4 (March 2025), Firefox 138. The browserslist in `{app,com,org}/core/package.json` is `chrome 111`, `edge 111`, `firefox 111`, `safari 16.4`, which is _below_ that on Safari and Firefox. A feature detect and a path that still works without it are therefore mandatory, in the shape already used for an optional browser API in `*/core/src/components/service-worker-registration.tsx`: `if (!('serviceWorker' in navigator)) { return; }`. |
| **The types claim it is always there** | TypeScript 7.0.2's `lib.dom.d.ts` declares `declare var cookieStore: CookieStore` — non-optional. So the feature detect above, written naively against the global, is a condition the compiler believes can never be false, and `typescript/no-unnecessary-condition` is an error in `src/`. Narrow through a locally declared optional reference instead. Reaching for a disable comment here suppresses a correct warning about a real portability problem.                                                  |

## 5. Where the code goes, when there is code

There is none yet. When there is:

- **It is copied per unit, not shared.** `no-restricted-imports` in each
  `.oxlintrc.json` bans a `shared/` module and
  `test/deployment-unit-boundaries.test.ts` bans cross-unit imports, for the same
  reason every unit owns its own `rails-client.ts` and `i18n/config.ts`: a unit
  that reaches across the boundary cannot be extracted into its own repository.
- **It must not import `server-only`.** `rails-client.ts` does, and it is the
  marker that makes the build fail when a client component reaches a module —
  which is exactly what a cookie helper is for. Nothing in `src/lib/` is
  currently reachable from a `'use client'` boundary; this would be the first.
- **Vitest already covers it.** Each unit runs `environment: 'happy-dom'`, and
  happy-dom implements `cookieStore`, so the supported path needs no stub. Test
  the unsupported path with the `Object.defineProperty` swap used in
  `*/core/test/service-worker-registration.test.tsx`. Coverage thresholds are
  99%, so both branches need a test, not just the happy one.
- **It reaches a browser bundle**, so run `pnpm run build && pnpm run check:size`
  as well as `pnpm run check`.

## 6. Nothing is built until something needs it

This file records how to do it, not a request to do it. No `cookie-store.ts`
wrapper, no typed cookie-name registry and no client/server shared constant
should be written before a feature needs one — a wrapper with no consumer is the
speculative abstraction YAGNI exists to prevent, and it would have to be
duplicated across up to twenty units to boot. Write the smallest thing the
first real feature needs, at that point, in that unit.
