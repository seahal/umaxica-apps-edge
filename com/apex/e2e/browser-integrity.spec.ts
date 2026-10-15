import { expect, test } from '@playwright/test';

/*
 * What only a running engine can report about a page it loaded: whether the
 * browser blocked anything under the Content-Security-Policy, and whether any
 * script threw. A CSP header can be correct in Hurl and still block this
 * unit's own script (a missing nonce, a new inline handler), and a hydration
 * mismatch or a component that throws after hydration never shows in the
 * status line. See adr/013-frames-tanstack-start.md for why the second matters.
 *
 * The CSP half only bites against a production build. Under `pnpm run dev`
 * (Playwright's `webServer`) `script-src` carries `'unsafe-inline'` for Vite,
 * so nothing can be blocked; and `vite preview` answers `localhost` with 421
 * because the production host allowlist applies. Point `baseURL` at a preview
 * deployment to exercise it. The script-error half works everywhere.
 *
 * Same probe as the other units, except the page: this apex answers `/` with
 * a 302 to a regional host off this Worker, so `/about` is its one document.
 */

test('the about page loads with no CSP violation and no script error', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      // Reported through the console so the listener above collects it.
      // eslint-disable-next-line no-console -- in-page probe, not unit code
      console.error(`csp: ${event.violatedDirective} ${event.blockedURI}`);
    });
  });

  await page.goto('/about');
  await page.waitForLoadState('networkidle');

  expect(problems).toEqual([]);
});
