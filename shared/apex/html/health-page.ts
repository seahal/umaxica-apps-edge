import { DEFAULT_BRAND_NAME } from '../brand';
import type { HealthRevision } from '../bindings';

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
  revision?: HealthRevision,
): string {
  const revisionValue = formatRevision(revision);

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

function formatRevision(revision?: HealthRevision): string {
  if (!revision) {
    return '';
  }

  return [revision.id, revision.tag, revision.timestamp]
    .filter((value): value is string => {
      return typeof value === 'string' && value.length > 0;
    })
    .map((value) => escapeHtml(String(value)))
    .join(' ');
}

export function getBrandName(env?: { BRAND_NAME?: string }): string {
  return env?.BRAND_NAME || DEFAULT_BRAND_NAME;
}
