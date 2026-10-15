import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, UI } from '../src/i18n';
import { CANONICAL_ORIGIN } from '../src/lib/canonical';
import { aboutPath, entriesPath, homePath, searchPath } from '../src/lib/publishing-routes';
import { siteCopy } from '../src/lib/site-copy';
import { renderDocument } from './utils/routes';

/*
 * The UMAXICA application shell, asserted on the emitted document.
 *
 * Assertions query landmarks, accessible names and document order, and do not
 * name a CSS class (docs/design/ui-shell-contract.md §1).
 *
 * This file is byte-identical across the twelve public cells. Product copy
 * comes from `siteCopy`, never a literal `Docs`.
 *
 * `@testing-library/react` is not a satellite dependency; the document is
 * HTML from `renderToStaticMarkup`, so the assertions read that string and
 * happy-dom's tree.
 */
const documents = new Map<string, string>();

beforeAll(async () => {
  for (const path of [homePath(DEFAULT_LOCALE), entriesPath(DEFAULT_LOCALE)]) {
    documents.set(path, await renderDocument(path));
  }
});

const shell = (path = homePath(DEFAULT_LOCALE)): string => {
  const html = documents.get(path);
  if (html === undefined) throw new Error(`no document rendered for ${path}`);
  return html;
};

const mount = (path = homePath(DEFAULT_LOCALE)) => {
  document.body.innerHTML = shell(path);
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('application shell', () => {
  it('emits exactly one header, main and footer, in document order', () => {
    const html = shell();

    for (const tag of ['header', 'main', 'footer']) {
      expect(html.match(new RegExp(`<${tag}[\\s>]`, 'gu')) ?? [], `<${tag}>`).toHaveLength(1);
    }

    expect(html.indexOf('<header')).toBeLessThan(html.indexOf('<main'));
    expect(html.indexOf('<main')).toBeLessThan(html.indexOf('<footer'));
  });

  it('exposes the four document landmarks and two named navigations', () => {
    const html = shell();
    const t = UI[DEFAULT_LOCALE];
    expect(html).toContain('<header');
    expect(html).toContain('<main');
    expect(html).toContain('<footer');
    expect(html.match(/<nav[\s>]/gu) ?? []).toHaveLength(2);
    expect(html).toContain(`aria-label="${t.primaryNavLabel}"`);
    expect(html).toContain(`aria-label="${t.utilityNavLabel}"`);
  });

  it('keeps the main navigation inside the header and has no menu button', () => {
    const html = shell();
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    const t = UI[DEFAULT_LOCALE];

    expect(header).toContain('<nav');
    expect(header).toContain(t.primaryNavLabel);
    expect(html).not.toContain('<button');
  });

  it('links the brand to home without stealing the page heading, with the product word beside it', () => {
    const html = shell();
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    const t = UI[DEFAULT_LOCALE];
    const product = siteCopy(DEFAULT_LOCALE).product;

    expect(header).toContain(`href="${homePath(DEFAULT_LOCALE)}"`);
    expect(header).toContain(t.brand);
    expect(header).toContain(product);
    expect(header).not.toContain('<h1');
  });

  it('opens the document with a skip link that actually moves focus', () => {
    mount();
    const t = UI[DEFAULT_LOCALE];
    const skip = document.body.querySelector(`a[href="#main-content"]`);
    expect(skip?.textContent).toBe(t.skipToMain);
    expect(document.body.querySelector('a, button, input, select, textarea, [tabindex]')).toBe(
      skip,
    );

    const main = document.body.querySelector('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('gives the footer two layers: a named utility nav and the site identity', () => {
    const html = shell();
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
    const t = UI[DEFAULT_LOCALE];

    expect(footer).toContain(`aria-label="${t.utilityNavLabel}"`);
    expect(footer).toContain(`href="${aboutPath(DEFAULT_LOCALE)}"`);
    expect(footer).toContain(t.about);
    expect(footer).not.toContain('preference');
    expect(footer).not.toContain('privacy');
    expect(footer).not.toContain('terms');
    expect(footer.indexOf('</nav>')).toBeLessThan(footer.indexOf('©'));
    expect(footer).toMatch(/©\s*\d{4} UMAXICA/u);
    expect(footer).toContain(`href="${CANONICAL_ORIGIN}/"`);
    expect(footer).toContain(`${CANONICAL_ORIGIN}/`);
  });

  it('marks the home navigation entry current on the home document', () => {
    const html = shell();
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    const t = UI[DEFAULT_LOCALE];
    expect(header).toContain(`href="${homePath(DEFAULT_LOCALE)}"`);
    expect(header).toMatch(new RegExp(`aria-current="page"[^>]*>${t.home}`, 'u'));
    expect(header).toContain(`href="${entriesPath(DEFAULT_LOCALE)}"`);
    expect(header).toContain(`href="${searchPath(DEFAULT_LOCALE)}"`);
  });
});
