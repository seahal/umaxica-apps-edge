import { renderToStaticMarkup } from 'react-dom/server';

let renderCount = 0;

vi.mock('../../src/components/NotFoundPage', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    NotFoundPage: () => {
      renderCount += 1;
      return <div data-testid="not-found" />;
    },
  };
});

const routeModule = await import('../../src/routes/catch-all');
const { loader, meta, default: CatchAll } = routeModule;

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Route: catch-all (org)', () => {
  it('exposes 404 metadata with robots rules', () => {
    const entries = meta({} as never);
    expect(entries).toContainEqual({
      title: '404 - ページが見つかりません | UMAXICA',
    });
    expect(entries).toContainEqual({
      content: 'noindex, nofollow',
      name: 'robots',
    });
  });

  it('throws a 404 response from the loader', () => {
    expect(() => loader({} as never)).toThrowError(Response);

    let caughtError: unknown;
    try {
      loader({} as never);
    } catch (error) {
      caughtError = error;
    }

    const response = caughtError as Response;
    expect(response.status).toBe(404);
    expect(response.statusText).toBe('ページが見つかりません');
  });

  it('renders the not found page component', () => {
    renderCount = 0;
    const markup = renderToStaticMarkup(<CatchAll />);

    expect(markup).toContain('data-testid="not-found"');
    expect(renderCount).toBe(1);
  });
});
