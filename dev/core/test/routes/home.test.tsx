import { render, screen } from '@testing-library/react';

vi.mock('../../src/components/DocsViewer', () => ({
  DocsViewer: () => <div data-testid="docs-viewer">Docs Content</div>,
}));

const Home = await import('../../src/routes/home');

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Home route (dev/core)', () => {
  it('renders DocsViewer component', () => {
    render(<Home.default />);

    expect(screen.getByTestId('docs-viewer')).toBeInTheDocument();
    expect(screen.getByText('Docs Content')).toBeInTheDocument();
  });

  it('exports meta function with correct title and description', () => {
    const { meta } = Home;
    expect(meta).toBeDefined();

    const metaResult = meta({ data: { codeName: 'UMAXICA' } } as never);
    expect(metaResult).toStrictEqual([
      { title: 'UMAXICA (dev)' },
      { content: 'React Aria Components のドキュメント', name: 'description' },
      { content: 'index, follow', name: 'robots' },
    ]);
  });

  it('exports loader that reads brand name from env', () => {
    const { loader } = Home;
    const result = loader({
      context: { runtime: { env: { BRAND_NAME: 'UMAXICA' } } },
    } as never);

    expect(result).toStrictEqual({ codeName: 'UMAXICA' });
  });
});
