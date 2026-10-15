/** @jsxImportSource hono/jsx */
import { buildBrandTitle, type BrandTitleOptions } from './brand';

type OpenGraphMeta = {
  title?: string;
  description?: string;
  type?: string;
  url?: string;
  image?: string;
};

type TwitterMeta = {
  card?: string;
  site?: string;
};

export type Meta = {
  title?: string;
  pageTitle?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  og?: OpenGraphMeta;
  twitter?: TwitterMeta;
};

// Typed against the one variable these helpers touch rather than `unknown`,
// so `getMeta` can return what it read instead of asserting it back into shape.
type MetaContext = {
  get: (key: 'meta') => Meta | undefined;
  set: (key: 'meta', value: Meta) => void;
};

function toNonEmptyTrimmed(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function setMeta(c: MetaContext, meta: Meta): void {
  c.set('meta', meta);
}

export function getMeta(c: MetaContext, defaultMeta?: Meta): Meta | undefined {
  return c.get('meta') ?? defaultMeta;
}

type SeoHeadProps = {
  c: MetaContext;
  brand: BrandTitleOptions;
  defaultMeta?: Meta;
};

export function SeoHead({ c, brand, defaultMeta }: SeoHeadProps) {
  const meta = getMeta(c, defaultMeta);
  const og = meta?.og;
  const twitter = meta?.twitter;
  const title = toNonEmptyTrimmed(meta?.title) ?? buildBrandTitle(meta?.pageTitle, brand);
  const description = toNonEmptyTrimmed(meta?.description);
  const canonical = toNonEmptyTrimmed(meta?.canonical);
  const robots = toNonEmptyTrimmed(meta?.robots);
  const twitterCard = toNonEmptyTrimmed(twitter?.card) ?? 'summary_large_image';

  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      {robots ? <meta name="robots" content={robots} /> : null}

      {toNonEmptyTrimmed(og?.title) ? <meta property="og:title" content={og?.title} /> : null}
      {toNonEmptyTrimmed(og?.description) ? (
        <meta property="og:description" content={og?.description} />
      ) : null}
      {toNonEmptyTrimmed(og?.type) ? <meta property="og:type" content={og?.type} /> : null}
      {toNonEmptyTrimmed(og?.url) ? <meta property="og:url" content={og?.url} /> : null}
      {toNonEmptyTrimmed(og?.image) ? <meta property="og:image" content={og?.image} /> : null}

      <meta name="twitter:card" content={twitterCard} />
      {toNonEmptyTrimmed(twitter?.site) ? (
        <meta name="twitter:site" content={twitter?.site} />
      ) : null}
    </>
  );
}
