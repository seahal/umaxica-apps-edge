const routeModule = await import('../../src/routes/catch-all');
const { loader, meta, default: CatchAll } = routeModule;

describe('Route: catch-all (dev/core)', () => {
  it('exposes 404 metadata with robots rules', () => {
    const entries = meta({} as never);

    expect(entries).toContainEqual({
      title: '404 - Page Not Found | Umaxica Developers',
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
    expect(response.statusText).toBe('Not Found');
  });

  it('renders no route content because the root error boundary handles the page', () => {
    expect(CatchAll()).toBeNull();
  });
});

export {};
