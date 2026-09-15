import type { Locale } from '../i18n';
import * as m from '../paraglide/messages';
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
  docs: (locale) => ({
    product: m.siteDocsProduct({}, { locale }),
    siteName: m.siteDocsSiteName({}, { locale }),
    heading: m.siteDocsHeading({}, { locale }),
    description: m.siteDocsDescription({}, { locale }),
    paragraphs: [m.siteDocsParagraph0({}, { locale })],
    aboutParagraphs: [m.siteDocsAbout0({}, { locale }), m.siteDocsAbout1({}, { locale })],
  }),
  help: (locale) => ({
    product: m.siteHelpProduct({}, { locale }),
    siteName: m.siteHelpSiteName({}, { locale }),
    heading: m.siteHelpHeading({}, { locale }),
    description: m.siteHelpDescription({}, { locale }),
    paragraphs: [m.siteHelpParagraph0({}, { locale })],
    aboutParagraphs: [m.siteHelpAbout0({}, { locale }), m.siteHelpAbout1({}, { locale })],
  }),
  info: (locale) => ({
    product: m.siteInfoProduct({}, { locale }),
    siteName: m.siteInfoSiteName({}, { locale }),
    heading: m.siteInfoHeading({}, { locale }),
    description: m.siteInfoDescription({}, { locale }),
    paragraphs: [m.siteInfoParagraph0({}, { locale })],
    aboutParagraphs: [m.siteInfoAbout0({}, { locale }), m.siteInfoAbout1({}, { locale })],
  }),
  news: (locale) => ({
    product: m.siteNewsProduct({}, { locale }),
    siteName: m.siteNewsSiteName({}, { locale }),
    heading: m.siteNewsHeading({}, { locale }),
    description: m.siteNewsDescription({}, { locale }),
    paragraphs: [m.siteNewsParagraph0({}, { locale })],
    aboutParagraphs: [m.siteNewsAbout0({}, { locale }), m.siteNewsAbout1({}, { locale })],
  }),
};

export function siteCopy(locale: Locale): SiteCopy {
  return COPY[PUBLISHING_SURFACE](locale);
}
