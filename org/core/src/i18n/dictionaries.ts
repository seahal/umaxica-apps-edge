import { notFound } from '@tanstack/react-router';

import * as m from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { isLocale, type Locale } from './config';
import './paraglide-client';

export type CoreDictionary = ReturnType<typeof createDictionary>;

function createDictionary(locale: Locale) {
  return {
    home: {
      title: m.coreHomeTitle({}, { locale }),
      description: m.coreHomeDescription({}, { locale }),
    },
    configuration: { title: m.coreConfigurationTitle({}, { locale }) },
    configuration_account: { title: m.coreConfigurationAccountTitle({}, { locale }) },
    explore: { title: m.coreExploreTitle({}, { locale }) },
    messages: {
      title: m.coreMessagesTitle({}, { locale }),
      wip: m.coreMessagesWip({}, { locale }),
    },
    notifications: {
      title: m.coreNotificationsTitle({}, { locale }),
      wip: m.coreNotificationsWip({}, { locale }),
    },
    about: { title: m.coreAboutTitle({}, { locale }) },
    publishing: {
      title: m.corePublishingTitle({}, { locale }),
      intro: m.corePublishingIntro({}, { locale }),
      manage: m.corePublishingManage({}, { locale }),
    },
    nav: {
      skip: m.coreNavSkip({}, { locale }),
      menu: m.coreNavMenu({}, { locale }),
      primary: m.coreNavPrimary({}, { locale }),
      utility: m.coreNavUtility({}, { locale }),
    },
    doctor: { title: m.coreDoctorTitle({}, { locale }) },
    notFound: {
      title: m.coreNotFoundTitle({}, { locale }),
      message: m.coreNotFoundMessage({}, { locale }),
    },
  };
}

/**
 * Resolve the request locale from Paraglide's async-local server context.
 * Callers may still provide a validated locale for isolated route tests.
 */
export const getDictionary = async (locale: string = getLocale()): Promise<CoreDictionary> => {
  if (!isLocale(locale)) {
    throw notFound();
  }

  return createDictionary(locale);
};
