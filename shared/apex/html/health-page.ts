import { DEFAULT_BRAND_NAME } from '../brand';

const HEALTH_ROBOTS_HEADER = 'noindex, nofollow';

export type RailsHealthResult =
  | { ok: true; status: number; body: string }
  | { ok: false; status: number; body: string }
  | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatRailsBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function buildHealthPageHtml(
  brandName: string,
  timestampIso: string,
  railsResult: RailsHealthResult | null,
  revision?: { id: string; tag: string; timestamp: string },
): string {
  const overallStatus = railsResult?.ok === false ? 'Error' : 'OK';
  const revisionInfo = revision
    ? `<div class="pt-4 border-t border-gray-200">
        <p><strong>Revision ID:</strong> ${escapeHtml(revision.id)}</p>
        <p><strong>Revision Tag:</strong> ${escapeHtml(revision.tag)}</p>
        <p><strong>Revision Time:</strong> ${escapeHtml(revision.timestamp)}</p>
      </div>`
    : '';

  let railsSection = '';
  if (!railsResult) {
    railsSection = `
      <section class="mt-8 pt-8 border-t border-gray-200">
        <h2 class="text-xl font-bold mb-4">Rails Backend</h2>
        <p>RAILS_API_URL not configured</p>
      </section>`;
  } else if (railsResult.ok) {
    const prettyBody = escapeHtml(formatRailsBody(railsResult.body));
    railsSection = `
      <section class="mt-8 pt-8 border-t border-gray-200">
        <h2 class="text-xl font-bold mb-4">Rails Backend</h2>
        <p><strong>Status:</strong> OK (HTTP ${railsResult.status})</p>
        <pre class="mt-2 p-4 bg-gray-100 rounded overflow-x-auto text-sm"><code>${prettyBody}</code></pre>
      </section>`;
  } else if ('status' in railsResult) {
    const prettyBody = escapeHtml(formatRailsBody(railsResult.body));
    railsSection = `
      <section class="mt-8 pt-8 border-t border-gray-200">
        <h2 class="text-xl font-bold mb-4">Rails Backend</h2>
        <p><strong>Status:</strong> Error (HTTP ${railsResult.status})</p>
        <pre class="mt-2 p-4 bg-gray-100 rounded overflow-x-auto text-sm"><code>${prettyBody}</code></pre>
      </section>`;
  } else {
    railsSection = `
      <section class="mt-8 pt-8 border-t border-gray-200">
        <h2 class="text-xl font-bold mb-4">Rails Backend</h2>
        <p><strong>Status:</strong> Unreachable</p>
        <p class="mt-2 text-red-600">Error: <code>${escapeHtml(railsResult.error)}</code></p>
      </section>`;
  }

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
          <p><strong>Status:</strong> ${overallStatus}</p>
          <p><strong>Timestamp:</strong> ${escapeHtml(timestampIso)}</p>
          ${revisionInfo}
        </div>
        ${railsSection}
      </div>
    </main>
  </body>
</html>`;
}

export function getBrandName(env?: { BRAND_NAME?: string }): string {
  return env?.BRAND_NAME || DEFAULT_BRAND_NAME;
}
