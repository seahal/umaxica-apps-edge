import '../../test-setup.ts';

import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import DecoratedLayout from '../../src/layouts/decorated';

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    useRouteLoaderData: (id: string) => {
      if (id === 'root') {
        return {
          codeName: 'MOCK_BRAND',
          newsServiceUrl: 'news.mock.com',
        };
      }
      return null;
    },
  };
});

describe('DecoratedLayout (com)', () => {
  it('renders header and footer with loader data', () => {
    const Stub = createRoutesStub([
      {
        Component: DecoratedLayout,
        path: '*',
      },
    ]);
    render(<Stub initialEntries={['/']} />);

    expect(screen.getAllByText('MOCK_BRAND').length).toBeGreaterThan(0);
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '📰' })).toHaveAttribute(
      'href',
      'https://news.mock.com',
    );
  });
});
