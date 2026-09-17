import type { Locale } from '../i18n';
import { messagesFor } from './message-catalog';
import { PUBLISHING_SURFACE } from './publishing-cell';
import type { PublishingSurface } from './publishing-model';

/*
 * Surface-specific copy comes from the same generated catalog as the shared
 * navigation. The surface is a build-time publishing cell, never request data,
 * and the parsed path locale is passed explicitly so the current URL contract
 * remains unchanged while its future `lx`/SEO decision is pending.
 */
export interface SiteCopy {
  /** The surface's product name, used as the home page title segment. */
  product: string;
  siteName: string;
  heading: string;
  description: string;
  paragraphs: readonly string[];
  aboutParagraphs: readonly string[];
}

const COPY: Record<PublishingSurface, (locale: Locale) => SiteCopy> = {
  docs: (locale) => {
    const m = messagesFor(locale);
    return {
      product: m.sitedocsproduct2({}),
      siteName: m.sitedocssitename3({}),
      heading: m.sitedocsheading2({}),
      description: m.sitedocsdescription2({}),
      paragraphs: [m.sitedocsparagraph02({})],
      aboutParagraphs: [m.sitedocsabout02({}), m.sitedocsabout12({})],
    };
  },
  help: (locale) => {
    const m = messagesFor(locale);
    return {
      product: m.sitehelpproduct2({}),
      siteName: m.sitehelpsitename3({}),
      heading: m.sitehelpheading2({}),
      description: m.sitehelpdescription2({}),
      paragraphs: [m.sitehelpparagraph02({})],
      aboutParagraphs: [m.sitehelpabout02({}), m.sitehelpabout12({})],
    };
  },
  info: (locale) => {
    const m = messagesFor(locale);
    return {
      product: m.siteinfoproduct2({}),
      siteName: m.siteinfositename3({}),
      heading: m.siteinfoheading2({}),
      description: m.siteinfodescription2({}),
      paragraphs: [m.siteinfoparagraph02({})],
      aboutParagraphs: [m.siteinfoabout02({}), m.siteinfoabout12({})],
    };
  },
  news: (locale) => {
    const m = messagesFor(locale);
    return {
      product: m.sitenewsproduct2({}),
      siteName: m.sitenewssitename3({}),
      heading: m.sitenewsheading2({}),
      description: m.sitenewsdescription2({}),
      paragraphs: [m.sitenewsparagraph02({})],
      aboutParagraphs: [m.sitenewsabout02({}), m.sitenewsabout12({})],
    };
  },
};

export function siteCopy(locale: Locale): SiteCopy {
  return COPY[PUBLISHING_SURFACE](locale);
}
