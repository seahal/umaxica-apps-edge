import { loader, meta, default as Health } from '../../src/routes/health';
import { render, screen } from '@testing-library/react';

describe('com/core health route', () => {
  it('provides the health status page title', () => {
    expect(meta()).toStrictEqual([{ title: 'Health Status | UMAXICA (com)' }]);
  });

  it('marks the response as noindex', async () => {
    const response = loader();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('renders health page with ok status', () => {
    render(<Health loaderData={{ status: 'ok', timestamp: '2024-01-01T00:00:00.000Z' }} />);

    expect(screen.getByText(/status:/)).toBeInTheDocument();
    expect(screen.getByText(/ok/)).toBeInTheDocument();
  });

  it('renders health page with error status', () => {
    render(<Health loaderData={{ status: 'error', timestamp: '2024-01-01T00:00:00.000Z' }} />);

    expect(screen.getByText(/status:/)).toBeInTheDocument();
    expect(screen.getByText(/error/)).toBeInTheDocument();
  });

  it('renders timestamp', () => {
    render(<Health loaderData={{ status: 'ok', timestamp: '2024-01-01T00:00:00.000Z' }} />);

    expect(screen.getByText(/2024-01-01T00:00:00.000Z/)).toBeInTheDocument();
  });
});
