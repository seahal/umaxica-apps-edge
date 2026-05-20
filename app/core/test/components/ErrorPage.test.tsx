// @ts-ignore
import '../../test-setup.ts';

import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <a href={to as string} {...rest}>
        {children}
      </a>
    ),
  };
});

const errorModule = await import('../../src/components/ErrorPage');
const { ErrorPage, ServiceUnavailablePage } = errorModule;
const { InternalServerErrorPage } = await import('../../src/routes/InternalServerErrorPage');
const { NotFoundPage } = await import('../../src/routes/NotFoundPage');

afterAll(() => {
  vi.restoreAllMocks();
});

describe('ErrorPage component (app)', () => {
  it('renders status, title and message content', () => {
    const markup = renderToStaticMarkup(
      <ErrorPage status={404} title="Not Found" message="missing" />,
    );

    expect(markup).toContain('404');
    expect(markup).toContain('Not Found');
    expect(markup).toContain('missing');
  });

  it('includes navigation links by default', () => {
    const markup = renderToStaticMarkup(
      <ErrorPage status={400} title="Bad Request" message="invalid" />,
    );

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/about"');
  });

  it('respects showNavigation and renders diagnostic details when requested', () => {
    const markup = renderToStaticMarkup(
      <ErrorPage
        status={500}
        title="Server error"
        message="boom"
        showNavigation={false}
        showDetails
        details="Something went wrong"
        stack="STACK_TRACE"
      />,
    );

    expect(markup).not.toContain('href="/"');
    expect(markup).toContain('Something went wrong');
    expect(markup).toContain('STACK_TRACE');
  });

  it('renders different icons based on status', () => {
    const icons = [
      { icon: '🔍', status: 404 },
      { icon: '⚠️', status: 500 },
      { icon: '🚧', status: 503 },
      { icon: '❌', status: 400 },
    ];

    for (const { status, icon } of icons) {
      const markup = renderToStaticMarkup(
        <ErrorPage status={status} title="Title" message="msg" />,
      );
      expect(markup).toContain(icon);
    }
  });

  it('renders suggestion when provided', () => {
    const markup = renderToStaticMarkup(
      <ErrorPage status={404} title="Title" message="msg" suggestion="Try this" />,
    );
    expect(markup).toContain('Try this');
  });
});

describe('Specialised error wrappers (app)', () => {
  it('renders the not found page with 404 specific copy', () => {
    const markup = renderToStaticMarkup(<NotFoundPage />);

    expect(markup).toContain('ページが見つかりません');
    expect(markup).toContain('404');
  });

  it('renders the internal server error page with detailed suggestion', () => {
    const markup = renderToStaticMarkup(
      <InternalServerErrorPage details="Database timeout" stack="TRACE" showDetails />,
    );

    expect(markup).toContain('500');
    expect(markup).toContain('サーバーエラー');
    expect(markup).toContain('Database timeout');
    expect(markup).toContain('TRACE');
  });

  it('renders the service unavailable page without navigation controls', () => {
    const markup = renderToStaticMarkup(<ServiceUnavailablePage />);

    expect(markup).toContain('503');
    expect(markup).toContain('メンテナンス中');
    expect(markup).not.toContain('href="/"');
  });
});
