import { DEFAULT_BRAND_NAME } from '../brand';

const HEALTH_ROBOTS_HEADER = 'noindex, nofollow';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildHealthPageHtml(
  brandName: string,
  timestampIso: string,
  revision?: { id: string; tag: string; timestamp: string },
): string {
  const revisionInfo = revision
    ? `<div class="pt-4 border-t border-gray-200">
        <p><strong>Revision ID:</strong> ${escapeHtml(revision.id)}</p>
        <p><strong>Revision Tag:</strong> ${escapeHtml(revision.tag)}</p>
        <p><strong>Revision Time:</strong> ${escapeHtml(revision.timestamp)}</p>
      </div>`
    : '';

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(brandName)}</title>
    <meta name="robots" content="${HEALTH_ROBOTS_HEADER}" />
    <link href="/src/style.css" rel="stylesheet" />
  </head>
  <body class="min-h-screen flex flex-col bg-gray-50">
    <main class="flex-grow max-w-7xl w-full mx-auto px-4 py-8">
      <div class="bg-white shadow rounded-lg p-6">
        <div class="space-y-4">
          <p><strong>Status:</strong> OK</p>
          <p><strong>Timestamp:</strong> ${escapeHtml(timestampIso)}</p>
          <p><strong>Revision:</strong> ${revisionValue}</p>
        </div>
      </div>
    </main>
  </body>
</html>`;
}

export function getBrandName(env?: { BRAND_NAME?: string }): string {
  return env?.BRAND_NAME || DEFAULT_BRAND_NAME;
}
