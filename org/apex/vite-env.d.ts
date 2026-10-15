/*
 * Vite resolves `?url` imports to the emitted asset's public path at build
 * time. Declared explicitly rather than by referencing `vite/client`, which
 * would pull in declarations for every asset type Vite knows about — this unit
 * imports exactly one, and the narrower declaration says so.
 *
 * It lives at the unit root, beside `hono-jsx.d.ts`, rather than in `src/`.
 * A `.d.ts` whose basename matches a sibling `.ts` is treated by TypeScript as
 * that file's generated declaration and silently dropped from the program, so
 * `src/assets.d.ts` next to `src/assets.ts` would never be read.
 */
declare module '*.css?url' {
  const url: string;
  export default url;
}

/*
 * Only the one flag `src/assets.ts` reads. Vite substitutes it with a literal
 * at build time, so widening this to Vite's full `ImportMetaEnv` would declare
 * a surface that nothing in this unit is allowed to grow into.
 */
interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
