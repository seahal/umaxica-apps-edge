// @ts-ignore
import '../../test-setup.ts';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Explore from '../../src/routes/explore/_index';

describe('Explore route', () => {
  it('renders trends when not searching', () => {
    render(<Explore loaderData={{ message: 'test' }} params={{}} matches={[]} />);

    expect(screen.getByText('いまどうしてる？')).toBeInTheDocument();
    expect(screen.getByText('#ReactAria')).toBeInTheDocument();
  });

  it('performs search when clicking search button', async () => {
    const user = userEvent.setup();
    render(<Explore loaderData={{ message: 'test' }} params={{}} matches={[]} />);

    const input = screen.getByPlaceholderText('ユーザー、投稿、トレンドを検索');
    await user.type(input, '田中');

    const searchButton = screen.getByRole('button', { name: '検索実行' });
    await user.click(searchButton);

    // Should show tabs
    expect(screen.getByRole('tab', { name: 'すべて' })).toBeInTheDocument();
    // Should show results (might be multiple: user and post)
    expect(screen.getAllByText('田中太郎').length).toBeGreaterThan(0);
  });

  it('performs search when pressing Enter', async () => {
    const user = userEvent.setup();
    render(<Explore loaderData={{ message: 'test' }} params={{}} matches={[]} />);

    const input = screen.getByPlaceholderText('ユーザー、投稿、トレンドを検索');
    await user.type(input, 'React{Enter}');

    expect(screen.getByRole('tab', { name: 'すべて' })).toBeInTheDocument();
  });

  it('clears search query and results', async () => {
    const user = userEvent.setup();
    render(<Explore loaderData={{ message: 'test' }} params={{}} matches={[]} />);

    const input = screen.getByRole('searchbox');
    await user.type(input, 'test');

    // Clear button should appear after typing
    const clearButton = screen.getByRole('button', { name: '検索をクリア' });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);

    expect(input).toHaveValue('');
  });

  it('switches between search result tabs', async () => {
    const user = userEvent.setup();
    render(<Explore loaderData={{ message: 'test' }} params={{}} matches={[]} />);

    const input = screen.getByPlaceholderText('ユーザー、投稿、トレンドを検索');
    await user.type(input, '田中{Enter}');

    const usersTab = screen.getByRole('tab', { name: 'ユーザー' });
    await user.click(usersTab);

    expect(usersTab).toHaveAttribute('aria-selected', 'true');
  });
});
