import {
  createStartHandler,
  defaultRenderHandler,
  defineHandlerCallback,
} from '@tanstack/react-start/server';

import { handleRequest } from './request-handler';
import './security-nonce-als';

/*
 * This unit's Worker entry (`main` in wrangler.jsonc), and wiring only: the
 * behaviour lives in `src/request-handler.ts`, because `createStartHandler`
 * resolves in the Worker build and nowhere else — so a test can reach the
 * boundary's logic but not this module.
 *
 * A plain `{ fetch }`, NOT `createServerEntry({ fetch })`, and the choice is
 * load-bearing: since 1.169, `createServerEntry` answers a path with invalid
 * percent-encoding (`/%E0%A4%A`) with a bare 400 before calling `fetch`, so
 * that 400 skipped `handleRequest` and left without security headers,
 * `X-Request-Id` or a completion log. With a plain entry the same 400 comes
 * from `createStartHandler`, inside `handleRequest`. The three Cores have the
 * same shape (`src/lib/app-handler.ts` in each); `api/malformed-path.hurl` pins
 * the result.
 *
 * `defaultRenderHandler`, NOT `defaultStreamHandler`, and the choice is
 * load-bearing: streaming flushes the shell before a failure is known, which
 * produces a 200 with no `<title>` for a thrown error. Rendering to a string
 * first also means the status and the `headers()` of every matched route are
 * final before the first byte is sent. See adr/013-frames-tanstack-start.md.
 *
 * The ALS nonce store is installed here so `node:async_hooks` never enters the
 * client graph (`security-nonce-als.ts`).
 *
 * `import.meta.env.PROD` is replaced with a literal at build time, so the
 * development branch of the CSP is eliminated from the deployed bundle.
 */
const fetchHandler = createStartHandler(defineHandlerCallback((ctx) => defaultRenderHandler(ctx)));

export default {
  async fetch(request: Request): Promise<Response> {
    return handleRequest(request, fetchHandler, import.meta.env.PROD);
  },
};
