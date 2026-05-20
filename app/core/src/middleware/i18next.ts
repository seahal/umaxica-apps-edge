import { initReactI18next } from 'react-i18next';
import { createCookie } from 'react-router';
import { createI18nextMiddleware } from 'remix-i18next/middleware';
import resources from '../locales';

export const localeCookie = createCookie('lng', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
});

export const [i18nextMiddleware, getLocale, getInstance] = createI18nextMiddleware({
  detection: {
    supportedLanguages: ['ja', 'en'],
    fallbackLanguage: 'ja',
    cookie: localeCookie,
  },
  i18next: { resources },
  plugins: [initReactI18next],
});
