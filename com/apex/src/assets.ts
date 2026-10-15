import compiledStyleUrl from './style.css?url';

/*
 * The one place the compiled stylesheet's URL is named.
 *
 * In a build, Vite emits `src/style.css` into the client output with a content
 * hash in the filename and rewrites the import above to that path. The hash is
 * what lets `public/_headers` mark the file `immutable`: Cloudflare serves
 * static assets as `public, max-age=0, must-revalidate` unless the name itself
 * is fingerprinted, so before this the stylesheet was revalidated on every
 * single document.
 *
 * In `vite dev` there is no hash and no emitted file. The import resolves to
 * the module URL `/src/style.css`, which the dev server answers with a
 * JavaScript module — Vite wraps CSS for hot replacement — so a `<link
 * rel="stylesheet">` pointed at it would be served as `text/javascript` and
 * silently not apply. `?direct` is the dev server's way to ask for the
 * compiled CSS itself, and it is a no-op on a built asset path, so the branch
 * below is the whole difference between the two modes.
 *
 * `import.meta.env.DEV` is replaced with a literal at build time, so the dev
 * branch is eliminated from the Worker bundle rather than shipped and skipped.
 *
 * The alternative is `vite-ssr-components`, whose `<Link>` component exists to
 * paper over exactly this; Hono's own Cloudflare + Vite guide uses it. It is
 * not worth a dependency for one `<link>` in a unit whose entire runtime
 * dependency list is two entries.
 */
export const styleUrl = import.meta.env.DEV ? `${compiledStyleUrl}?direct` : compiledStyleUrl;
