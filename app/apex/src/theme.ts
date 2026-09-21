/*
 * The colour scheme this document is rendered in, read from a cookie on the
 * server rather than decided in the browser.
 *
 * `theme=light` and `theme=dark` force a scheme. Every other value — the
 * cookie missing, `system`, or anything unrecognised — leaves the attribute
 * off the root element, which is what hands the decision back to
 * `prefers-color-scheme`; `style.css` defines the `dark` variant around
 * exactly that three-way split.
 *
 * Deliberately read-only. Nothing in this repository sets `theme` yet: the
 * header's actions slot is still empty by design (`shell.tsx`), and a control
 * that writes this cookie is a browser concern bound by
 * `docs/development/browser-cookie-access.md`. Honouring a cookie something
 * else sets costs one header read; the OS preference works today either way.
 *
 * Only the apex Workers do this. Core strips inbound Cookie on
 * application-owned requests (ADR 007). The twelve public frames do not strip
 * Cookie, but they also do not read a theme cookie: they stay light-only.
 */

/**
 * The value for the root element's `data-theme`, or `undefined` to omit the
 * attribute entirely. `undefined` rather than `'system'` because there is no
 * `data-theme="system"` — following the OS is the absence of the attribute.
 */
export type ThemeAttribute = 'light' | 'dark' | undefined;

/*
 * Reading the header rather than `hono/cookie`'s `getCookie`, which takes a
 * `Context`. `renderer.tsx` has no typed one to give it: `jsxRenderer`'s
 * component callback is not generic in `Env`, so its `c` is `Context<any>` and
 * passing that to a `Context<ApexEnv>` parameter is the unsafe argument
 * `lint:types` rejects. A `Request` is what `checkRateLimit` already takes in
 * this unit for the same reason, and every call site holds one.
 *
 * Finds the cookie; does not judge it. Which values mean something is
 * `resolveThemeAttribute`'s decision alone, so the two cannot drift apart.
 */
const THEME_COOKIE = /(?:^|;)\s*theme=([^;]*)/u;

export function resolveThemeAttribute(value: string | undefined): ThemeAttribute {
  return value === 'light' || value === 'dark' ? value : undefined;
}

export function requestThemeAttribute(request: Request): ThemeAttribute {
  return resolveThemeAttribute(THEME_COOKIE.exec(request.headers.get('cookie') ?? '')?.[1]);
}

/**
 * The attribute for the documents this unit builds as raw HTML rather than as
 * JSX — the status and health pages. Empty when nothing is forced,
 * which is how those documents omit it as `renderer.tsx` does.
 *
 * Interpolating it into markup needs no escaping and gets none: the value is
 * one of two literals or `undefined`, never a cookie value read back out.
 */
export function themeAttributeMarkup(theme: ThemeAttribute): string {
  return theme ? ` data-theme="${theme}"` : '';
}
