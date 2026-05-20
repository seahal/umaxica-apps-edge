// @ts-ignore
import '../../test-setup.ts';

const { render } = await import('@testing-library/react');

let renderCount = 0;

vi.mock('../../src/routes/NotFoundPage', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    NotFoundPage: () => {
      renderCount += 1;
      return <div data-testid="not-found-page" />;
    },
  };
});

const catchAllModule = await import('../../src/routes/catch-all');
const { default: CatchAll, meta, loader, handle } = catchAllModule;

afterAll(() => {
  vi.restoreAllMocks();
});

describe('catch-all route', () => {
  it('defines handle metadata for breadcrumbs', () => {
    expect(handle.titleName).toBe('404 - ページが見つかりません');
    expect(handle.breadcrumb()).toBe('404');
  });

  it('returns SEO metadata', () => {
    expect(meta({} as never)).toStrictEqual([
      { title: '404 - ページが見つかりません' },
      {
        content:
          'お探しのページは見つかりませんでした。URLを確認するか、ホームページから目的のページをお探しください。',
        name: 'description',
      },
      { content: 'noindex, nofollow', name: 'robots' },
    ]);
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
    const { getByTestId } = render(<CatchAll />);
    expect(getByTestId('not-found-page')).toBeInTheDocument();
    expect(renderCount).toBe(1);
  });
});
