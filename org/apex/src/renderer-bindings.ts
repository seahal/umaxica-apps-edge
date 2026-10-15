import { brandFromEnv, getBrandName, type BrandTitleOptions } from './brand';
import { requestThemeAttribute, type ThemeAttribute } from './theme';

/*
 * The per-request values the JSX renderer reads. Kept out of `renderer.tsx` so
 * Vitest can drive the binding half (a Workers `BRAND_NAME` no HTTP client can
 * vary) without covering the document chrome, which belongs to Hurl.
 */
export type RendererBindings = {
  year: number;
  brandName: string;
  language: string | undefined;
  theme: ThemeAttribute;
  brand: BrandTitleOptions;
};

type RendererContext = {
  env?: Record<string, unknown>;
  get: (key: 'language') => string | undefined;
  req: { raw: Request };
};

export function rendererBindings(c: RendererContext): RendererBindings {
  return {
    year: new Date().getUTCFullYear(),
    brandName: getBrandName(c.env),
    language: c.get('language'),
    theme: requestThemeAttribute(c.req.raw),
    brand: brandFromEnv(c),
  };
}
