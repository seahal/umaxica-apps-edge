import type * as ReactRouter from 'react-router';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Links: (props: Record<string, unknown>) => createElement('vi-links', props),
    Meta: (props: Record<string, unknown>) => createElement('vi-meta', props),
    Scripts: (props: Record<string, unknown>) => createElement('vi-scripts', props),
    ScrollRestoration: (props: Record<string, unknown>) => createElement('vi-scroll', props),
  };
});

const actualRouter = await vi.importActual<typeof ReactRouter>('react-router');

const layoutModule = await import('../../src/layouts/baremetal');
const { Layout, meta, default: App } = layoutModule;

afterAll(() => {
  vi.restoreAllMocks();
});

describe('baremetal layout', () => {
  it('provides default meta title', () => {
    expect(meta({} as never)).toStrictEqual([{ title: '' }]);
  });

  it('renders html skeleton with router primitives', () => {
    const html = renderToStaticMarkup(
      <Layout>
        <div>content</div>
      </Layout>,
    );

    expect(html).toContain('<html lang="ja">');
    expect(html).toContain('<vi-meta');
    expect(html).toContain('<vi-links');
    expect(html).toContain('<vi-scroll');
    expect(html).toContain('<vi-scripts');
    expect(html).toContain('content');
  });

  it('returns an outlet placeholder', () => {
    const element = App();
    expect(element.type).toBe(actualRouter.Outlet);
  });
});
