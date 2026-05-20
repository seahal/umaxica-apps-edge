import { useTranslation } from 'react-i18next';

// Implementation of data helper as the one from react-router might not be picked up by linting tools
function data<T>(body: T, init?: number | ResponseInit): Response {
  const responseInit = typeof init === 'number' ? { status: init } : init;
  const headers = new Headers(responseInit?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }
  return new Response(JSON.stringify(body), {
    ...responseInit,
    headers,
  });
}

type HealthLoaderData = {
  status: 'ok' | 'error';
  timestamp: string;
};

export function meta() {
  return [{ title: 'Health Status | UMAXICA (app)' }];
}

export function loader() {
  const timestamp = new Date().toISOString();
  const headers = { 'X-Robots-Tag': 'noindex, nofollow' };

  try {
    return data<HealthLoaderData>({ status: 'ok', timestamp }, { status: 200, headers });
  } catch {
    return data<HealthLoaderData>({ status: 'error', timestamp }, { status: 503, headers });
  }
}

export default function Health({ loaderData }: { loaderData: HealthLoaderData }) {
  const { t } = useTranslation('health');

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>
        {t('status')}: {loaderData.status === 'ok' ? t('ok') : t('error')}
      </p>
      <p>
        {t('timestamp')}: {loaderData.timestamp}
      </p>
    </main>
  );
}
