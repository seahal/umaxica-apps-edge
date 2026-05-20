import { Window } from 'happy-dom';
import { renderToStaticMarkup } from 'react-dom/server';

import { Footer } from '../../src/components/Footer';

type FooterProps = Parameters<typeof Footer>[0];

function renderFooter(props?: Partial<FooterProps>) {
  const markup = renderToStaticMarkup(<Footer {...((props ?? {}) as FooterProps)} />);
  const window = new Window();
  window.document.body.innerHTML = markup;
  return window.document;
}

describe('Footer component', () => {
  it('renders a footer landmark with fallback branding when codeName is omitted', () => {
    const document = renderFooter();
    const footer = document.querySelector('footer');
    expect(footer).toBeTruthy();

    const heading = footer?.querySelector('h3');
    expect(heading?.textContent).toBe('???');
  });

  it('renders provided codeName in branding and copyright notice', () => {
    const codeName = 'Stardust';
    const document = renderFooter({ codeName });
    const heading = document.querySelector('footer h3');
    expect(heading?.textContent).toBe(codeName);

    const currentYear = new Date().getFullYear();
    const copyright = [...document.querySelectorAll('footer p')].find((paragraph) =>
      paragraph.textContent?.includes(`© ${currentYear}`),
    );
    expect(copyright).toBeTruthy();
    if (!copyright) {
      return;
    }
    expect(copyright.textContent).toContain(`© ${currentYear} ${codeName}.`);
  });

  it('renders quick links with expected routes', () => {
    const document = renderFooter();
    const links = [...document.querySelectorAll('footer nav a')].map((link) => ({
      href: link.getAttribute('href'),
      name: link.textContent?.trim(),
    }));

    expect(links).toStrictEqual([
      { href: '/', name: 'ホーム' },
      { href: '/contact', name: 'お問い合わせ' },
    ]);
  });

  it('renders social links that open externally with descriptive labels', () => {
    const document = renderFooter();
    const socialLinks = [...document.querySelectorAll('footer a[aria-label]')];

    const assertions = socialLinks.map((link) => [
      link.getAttribute('aria-label'),
      link.getAttribute('href'),
      link.getAttribute('target'),
      link.getAttribute('rel'),
    ]);

    expect(assertions).toContainEqual([
      'GitHub',
      'https://github.com/seahal/umaxica-app-edge',
      '_blank',
      'noopener noreferrer',
    ]);
    expect(assertions).toContainEqual([
      'Twitter',
      'https://x.com/umaxica',
      '_blank',
      'noopener noreferrer',
    ]);
  });

  it('includes privacy and terms legal links', () => {
    const document = renderFooter();
    const links = [...document.querySelectorAll('footer a')];
    const privacy = links.find((link) => link.textContent?.trim() === 'プライバシーポリシー');
    const terms = links.find((link) => link.textContent?.trim() === '利用規約');

    expect(privacy?.getAttribute('href')).toBe('https://jp.docs.umaxica.app/privacy');
    expect(terms?.getAttribute('href')).toBe('https://jp.docs.umaxica.app/privacy');
  });
});
