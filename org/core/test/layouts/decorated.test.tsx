import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let routeLoaderDataOverride:
  | { codeName?: string; helpUrl?: string; docsUrl?: string; newsUrl?: string }
  | undefined;

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Outlet: () => createElement('vi-outlet'),
    useRouteLoaderData: () => routeLoaderDataOverride,
  };
});

vi.mock('../../src/components/Header', () => ({
  Header: (props: Record<string, unknown>) => createElement('vi-header', props),
}));

vi.mock('../../src/components/Footer', () => ({
  Footer: (props: Record<string, unknown>) => createElement('vi-footer', props),
}));

const { default: DecoratedLayout } = await import('../../src/layouts/decorated');

describe('org_www DecoratedLayout', () => {
  it('renders layout with all components when data is available', () => {
    routeLoaderDataOverride = {
      codeName: 'TestOrg',
      docsUrl: 'https://docs.org.com',
      helpUrl: 'https://help.org.com',
      newsUrl: 'https://news.org.com',
    };

    const markup = renderToStaticMarkup(<DecoratedLayout />);

    expect(markup).toContain('<vi-header');
    expect(markup).toContain('<vi-outlet');
    expect(markup).toContain('<vi-footer');
    expect(markup).toContain('<vi-header');
  });

  it('uses empty strings when loader data is undefined', () => {
    routeLoaderDataOverride = undefined;

    const markup = renderToStaticMarkup(<DecoratedLayout />);

    expect(markup).toContain('<vi-header');
    expect(markup).toContain('<vi-outlet');
    expect(markup).toContain('<vi-footer');
  });

  it('uses empty strings when loader data properties are missing', () => {
    routeLoaderDataOverride = {};

    const markup = renderToStaticMarkup(<DecoratedLayout />);

    expect(markup).toContain('<vi-header');
    expect(markup).toContain('<vi-outlet');
    expect(markup).toContain('<vi-footer');
  });
});

afterAll(() => {
  routeLoaderDataOverride = undefined;
  vi.restoreAllMocks();
});
