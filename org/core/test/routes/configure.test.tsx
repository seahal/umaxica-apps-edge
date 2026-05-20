import { renderToStaticMarkup } from 'react-dom/server';

const routeModule = await import('../../src/routes/configure');
const { loader, meta, default: ConfigureRoute } = routeModule;

function runLoader(env: Record<string, unknown>) {
  return loader({
    context: { cloudflare: { env } },
  } as never);
}

describe('Route: configure (org)', () => {
  it('declares expected metadata', () => {
    const entries = meta({} as never);
    expect(entries).toContainEqual({ title: 'configure' });
    expect(entries).toContainEqual({
      content: 'Welcome to React Router!',
      name: 'description',
    });
  });

  it('resolves Cloudflare environment data', () => {
    const result = runLoader({ VALUE_FROM_CLOUDFLARE: 'org-value' });
    expect(result).toStrictEqual({ message: 'org-value' });
  });

  it('renders configuration content', () => {
    const markup = renderToStaticMarkup(<ConfigureRoute loaderData={{ message: 'org-value' }} />);

    expect(markup).toContain('Configuration');
    expect(markup).toContain('acccount');
    expect(markup).toContain('preferences');
  });
});
