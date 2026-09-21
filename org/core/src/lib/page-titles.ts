import { defaultLocale, type Locale } from '@/i18n/config';

import * as m from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { brandTitle } from './title';

export type PageTitleKey =
  | 'about'
  | 'configuration'
  | 'configuration_account'
  | 'doctor'
  | 'explore'
  | 'messages'
  | 'notifications'
  | 'publishing';

function localizedPageTitle(key: PageTitleKey, locale: Locale): string {
  switch (key) {
    case 'about':
      return brandTitle(m.coreAboutTitle({}, { locale }));
    case 'configuration':
      return brandTitle(m.coreConfigurationTitle({}, { locale }));
    case 'configuration_account':
      return brandTitle(m.coreConfigurationAccountTitle({}, { locale }));
    case 'doctor':
      return brandTitle(m.coreDoctorTitle({}, { locale }));
    case 'explore':
      return brandTitle(m.coreExploreTitle({}, { locale }));
    case 'messages':
      return brandTitle(m.coreMessagesTitle({}, { locale }));
    case 'notifications':
      return brandTitle(m.coreNotificationsTitle({}, { locale }));
    case 'publishing':
      return brandTitle(m.corePublishingTitle({}, { locale }));
  }
}

/** Resolve a route head title from the request-local Paraglide context. */
export function pageTitle(key: PageTitleKey): string {
  return localizedPageTitle(key, getLocale());
}

/*
 * The default strings remain exported for tests and client-side announcement
 * fixtures. Route heads call `pageTitle()` so SSR can use the request locale.
 */
export const pageTitles = {
  about: localizedPageTitle('about', defaultLocale),
  configuration: localizedPageTitle('configuration', defaultLocale),
  configuration_account: localizedPageTitle('configuration_account', defaultLocale),
  doctor: localizedPageTitle('doctor', defaultLocale),
  explore: localizedPageTitle('explore', defaultLocale),
  messages: localizedPageTitle('messages', defaultLocale),
  notifications: localizedPageTitle('notifications', defaultLocale),
  publishing: localizedPageTitle('publishing', defaultLocale),
} as const;
