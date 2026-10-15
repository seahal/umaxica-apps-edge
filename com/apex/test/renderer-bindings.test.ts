import { describe, expect, it } from 'vitest';

import { rendererBindings } from '../src/renderer-bindings';

/*
 * `BRAND_NAME` is a Workers binding, so no HTTP client can vary it. The title
 * it produces on a route that sets no page name is asserted in `src/brand.ts`
 * and `src/seo.tsx`; this file only proves the renderer reads that binding
 * through `rendererBindings`, not through a throwaway Hono app.
 */
describe('rendererBindings', () => {
  it('reads BRAND_NAME from the Workers binding', () => {
    const bindings = rendererBindings({
      env: { BRAND_NAME: 'UMAXICA' },
      get: () => undefined,
      req: { raw: new Request('http://localhost/') },
    });

    expect(bindings.brandName).toBe('UMAXICA');
    expect(bindings.brand.brandName).toBe('UMAXICA');
  });
});
