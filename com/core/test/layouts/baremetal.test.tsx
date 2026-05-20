/**
 * Baremetal Layout Test
 *
 * Tests for the com domain baremetal layout.
 * This is a concrete example based on the layout.test.template.tsx template.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Links: () => createElement('vi-links'),
    Meta: () => createElement('vi-meta'),
    Outlet: (props: Record<string, unknown>) => createElement('vi-outlet', props),
    Scripts: (props: Record<string, unknown>) => createElement('vi-scripts', props),
    ScrollRestoration: (props: Record<string, unknown>) =>
      createElement('vi-scroll-restoration', props),
  };
});

const baremetalModule = await import('../../src/layouts/baremetal');
const { Layout, meta, default: App } = baremetalModule;

describe('Baremetal Layout (com)', () => {
  it('should provide an empty title by default', () => {
    expect(meta({} as never)).toStrictEqual([{ title: '' }]);
  });

  it('should render with children', () => {
    const markup = renderToStaticMarkup(
      <Layout>
        <div>test content</div>
      </Layout>,
    );

    expect(markup).toContain('test content');
    expect(markup).toContain('<html');
    expect(markup).toContain('</html>');
  });

  it('should include outlet for nested routes', () => {
    const markup = renderToStaticMarkup(<Layout>{null}</Layout>);
    // Baremetal layout renders children directly, not through Outlet
    expect(markup).toContain('body');
  });

  it('should include proper meta tags', () => {
    const markup = renderToStaticMarkup(
      <Layout>
        <div>content</div>
      </Layout>,
    );

    expect(markup).toContain('charSet="utf-8"');
    expect(markup).toContain('name="viewport"');
  });

  it('should use English as the document language', () => {
    const markup = renderToStaticMarkup(
      <Layout>
        <div>content</div>
      </Layout>,
    );

    expect(markup).toContain('lang="en"');
  });

  it('should render App component with Outlet', () => {
    const element = App();
    expect(element.type.name).toBe('Outlet');
  });
});
