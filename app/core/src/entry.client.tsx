import i18next from 'i18next';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { HydratedRouter } from 'react-router/dom';
import resources from './locales';

async function main() {
  await i18next.use(initReactI18next).init({
    fallbackLng: 'ja',
    detection: { order: ['htmlTag'], caches: [] },
    resources,
  });

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <HydratedRouter />
        </StrictMode>
      </I18nextProvider>,
    );
  });
}

main().catch((error: unknown) => {
  if (typeof reportError === 'function') {
    reportError(error);
    return;
  }

  throw error;
});
