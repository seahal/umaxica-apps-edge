import '../../test-setup.ts';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Explore from '../../src/routes/explore/_index';

describe('Explore route (com)', () => {
  it('renders explore page title', () => {
    render(<Explore loaderData={{ message: 'test message' }} params={{}} matches={[]} />);

    expect(
      screen.getByText('Umaxica を横断検索し、静かなシグナルをすぐに捉える'),
    ).toBeInTheDocument();
    expect(screen.getByText('test message')).toBeInTheDocument();
  });

  it('filters results based on query', async () => {
    const user = userEvent.setup();
    render(<Explore loaderData={{ message: '' }} params={{}} matches={[]} />);

    const input = screen.getByPlaceholderText('例: onboarding, account liaison, latency');
    await user.type(input, 'Atlas');

    expect(screen.getByText('Atlas Console')).toBeInTheDocument();
    expect(screen.queryByText('Edge Discovery Kit')).not.toBeInTheDocument();
  });

  it('filters results based on tags/categories', async () => {
    const user = userEvent.setup();
    render(<Explore loaderData={{ message: '' }} params={{}} matches={[]} />);

    const productsTag = screen.getByRole('gridcell', { name: 'プロダクト' });
    await user.click(productsTag);

    expect(screen.getByText('Atlas Console')).toBeInTheDocument();
    expect(screen.queryByText('Client Liaison Squad')).not.toBeInTheDocument();
  });

  it('shows no results message when no matches found', async () => {
    const _user = userEvent.setup();
    render(<Explore loaderData={{ message: '' }} params={{}} matches={[]} />);

    const input = screen.getByPlaceholderText('例: onboarding, account liaison, latency');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: 'NONEXISTENT_QUERY' } });

    expect(screen.getByText(/検索条件に一致する結果が見つかりません/)).toBeInTheDocument();
  });
});
