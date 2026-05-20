import '../../test-setup.ts';

import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-aria-components', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Link: ({
      href,
      children,
      ...rest
    }: {
      href: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <a href={href} {...rest}>
        {children}
      </a>
    ),
    Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  };
});

const { Footer } = await import('../../src/components/Footer');

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Footer component (com)', () => {
  it('falls back to placeholder branding when code name is absent', () => {
    const markup = renderToStaticMarkup(<Footer />);

    expect(markup).toContain('???');
    expect(markup).toContain(new Date().getFullYear().toString());
  });

  it('renders provided code name and quick links', () => {
    const markup = renderToStaticMarkup(<Footer codeName="Commerce Hub" />);

    expect(markup).toContain('Commerce Hub');
    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="https://jp.help.umaxica.com/contacts/new"');
    expect(markup).not.toContain('href="/about"');
  });

  it('exposes social links with security attributes', () => {
    const markup = renderToStaticMarkup(<Footer codeName="Commerce Hub" />);

    expect(markup).toContain('href="https://github.com/seahal/umaxica-app-edge"');
    expect(markup).toContain('href="https://x.com/umaxica"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });
});
