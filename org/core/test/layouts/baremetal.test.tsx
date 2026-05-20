import '../../test-setup.ts';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Links: (props: Record<string, unknown>) => createElement('mock-links', props),
    Meta: (props: Record<string, unknown>) => createElement('mock-meta', props),
    Outlet: () => createElement('mock-outlet'),
    Scripts: (props: Record<string, unknown>) => createElement('mock-scripts', props),
    ScrollRestoration: (props: Record<string, unknown>) => createElement('mock-scroll', props),
  };
});

const baremetal = await import('../../src/layouts/baremetal');

afterAll(() => {
  vi.restoreAllMocks();
});

describe('baremetal layout (org/core)', () => {
  it('exports meta function with empty title', () => {
    const result = baremetal.meta({} as never);
    expect(result).toStrictEqual([{ title: '' }]);
  });

  it('renders Layout with html structure', () => {
    const markup = renderToStaticMarkup(
      baremetal.Layout({ children: createElement('div', null, 'test content') }),
    );

    expect(markup).toContain('<html lang="en">');
    expect(markup).toContain('<head>');
    expect(markup).toContain('<body>');
    expect(markup).toContain('<meta charSet="utf-8"');
    expect(markup).toContain('<meta name="viewport"');
    expect(markup).toContain('<mock-meta');
    expect(markup).toContain('<mock-links');
    expect(markup).toContain('<mock-scroll');
    expect(markup).toContain('<mock-scripts');
    expect(markup).toContain('test content');
  });

  it('renders App component with Outlet', () => {
    const markup = renderToStaticMarkup(baremetal.default());

    expect(markup).toContain('<mock-outlet');
  });
});
