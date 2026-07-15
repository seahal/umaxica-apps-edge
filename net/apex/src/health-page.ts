import { getBrandName } from './brand';
import { APEX_INLINE_STYLE } from './inline-style';
import type { AssetEnv } from './security-headers';

const HEALTH_ROBOTS_HEADER = 'noindex, nofollow';

type HealthPayload = {
  status: 'OK';
  service: string;
  version: string | null;
  edge: 'cloudflare';
  time: string;
};

type HealthPageOptions = {
  service: string;
};

function buildHealthPayload(env: AssetEnv, options: HealthPageOptions): HealthPayload {
  return {
    status: 'OK',
    service: options.service,
    version: env?.CF_VERSION_METADATA?.id ?? null,
    edge: 'cloudflare',
    time: new Date().toISOString(),
  };
}

function buildHealthPageHtml(brandName: string, payload: HealthPayload): string {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${brandName} | Health status</title>
    <meta name="robots" content="${HEALTH_ROBOTS_HEADER}" />
    <style>${APEX_INLINE_STYLE}</style>
  </head>
  <body class="min-h-screen flex flex-col bg-gray-50">
    <main class="flex-grow max-w-7xl w-full mx-auto px-4 py-8">
      <div class="space-y-4">
        <h1>status</h1>
        <dl>
          <dt>status</dt>
          <dd>${payload.status}</dd>
          <dt>service</dt>
          <dd>${payload.service}</dd>
          <dt>version</dt>
          <dd>${String(payload.version)}</dd>
          <dt>edge</dt>
          <dd>${payload.edge}</dd>
          <dt>time</dt>
          <dd>${payload.time}</dd>
        </dl>
      </div>
    </main>
    <footer>© ${new Date(payload.time).getUTCFullYear()} ${brandName}</footer>
  </body>
</html>`;
}

function buildHealthErrorHtml(brandName: string, timestampIso: string): string {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${brandName}</title>
    <meta name="robots" content="${HEALTH_ROBOTS_HEADER}" />
  </head>
  <body>
    <main>
      <p>status: error</p>
      <p>timestamp: ${timestampIso}</p>
    </main>
  </body>
</html>`;
}

export function renderHealthPage(env: AssetEnv, options: HealthPageOptions): Response {
  const payload = buildHealthPayload(env, options);
  const brandName = getBrandName(env);

  try {
    return new Response(buildHealthPageHtml(brandName, payload), {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'X-Robots-Tag': HEALTH_ROBOTS_HEADER,
      },
    });
  } catch {
    return new Response(buildHealthErrorHtml(brandName, payload.time), {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'X-Robots-Tag': HEALTH_ROBOTS_HEADER,
      },
    });
  }
}

export function renderHealthJson(env: AssetEnv, options: HealthPageOptions): Response {
  return new Response(JSON.stringify(buildHealthPayload(env, options)), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'X-Robots-Tag': HEALTH_ROBOTS_HEADER,
    },
  });
}
