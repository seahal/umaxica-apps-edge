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
const { InternalServerErrorPage } = await import('../../src/components/InternalServerErrorPage');
const { NotFoundPage } = await import('../../src/components/NotFoundPage');

afterAll(() => {
  vi.restoreAllMocks();
});

describe('ErrorPage component (org)', () => {
  it('renders status, title, and message text', () => {
    const markup = renderToStaticMarkup(
      <ErrorPage status={400} title="Bad Request" message="invalid" />,
    );

    expect(markup).toContain('400');
    expect(markup).toContain('Bad Request');
    expect(markup).toContain('invalid');
  });

  it('renders navigation links by default', () => {
    const markup = renderToStaticMarkup(
      <ErrorPage status={404} title="missing" message="not found" />,
    );

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/sample"');
    expect(markup).toContain('href="/configure"');
    expect(markup).not.toContain('href="/about"');
  });

  it('honours showNavigation and shows diagnostic details', () => {
    const markup = renderToStaticMarkup(
      <ErrorPage
        status={500}
        title="Server Error"
        message="boom"
        showNavigation={false}
        showDetails
        details="Database timeout"
        stack="STACK_TRACE"
      />,
    );

    expect(markup).not.toContain('href="/"');
    expect(markup).toContain('Database timeout');
    expect(markup).toContain('STACK_TRACE');
  });
});

describe('Error page wrappers (org)', () => {
  it('renders not found copy with 404 status', () => {
    const markup = renderToStaticMarkup(<NotFoundPage />);

    expect(markup).toContain('ページが見つかりません');
    expect(markup).toContain('404');
  });

  it('renders internal server error with additional context', () => {
    const markup = renderToStaticMarkup(
      <InternalServerErrorPage details="Unhandled rejection" stack="TRACE" showDetails />,
    );

    expect(markup).toContain('500');
    expect(markup).toContain('サーバーエラー');
    expect(markup).toContain('Unhandled rejection');
    expect(markup).toContain('TRACE');
  });

  it('renders service unavailable content without navigation links', () => {
    const markup = renderToStaticMarkup(<ServiceUnavailablePage />);

    expect(markup).toContain('503');
    expect(markup).toContain('メンテナンス中');
    expect(markup).not.toContain('href="/"');
  });
});
