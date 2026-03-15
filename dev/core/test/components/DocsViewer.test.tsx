import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { DocsViewer } from '../../src/components/DocsViewer';

describe('DocsViewer Component', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the initial section', () => {
    render(<DocsViewer />);
    // Use getAllByText and check if the first one exists, or use a more specific query
    expect(screen.getAllByText('はじめに').length).toBeGreaterThan(0);
    expect(screen.getByText(/React Aria Components へようこそ/)).toBeDefined();
  });

  it('switches sections when clicking on sidebar items', () => {
    render(<DocsViewer />);
    const buttonItem = screen.getByRole('option', { name: 'Button コンポーネント' });
    fireEvent.click(buttonItem);

    expect(screen.getByRole('heading', { name: 'Button コンポーネント' })).toBeDefined();
    expect(screen.getByText(/Button は最も基本的なコンポーネントの一つです/)).toBeDefined();
  });

  it('filters sections based on search query', () => {
    render(<DocsViewer />);
    const searchInput = screen.getByPlaceholderText('検索...');

    fireEvent.change(searchInput, { target: { value: 'Tabs' } });

    expect(screen.queryByRole('option', { name: 'Button コンポーネント' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Tabs コンポーネント' })).toBeDefined();
  });

  it('switches between Description and Code Example tabs', () => {
    render(<DocsViewer />);
    const codeTab = screen.getByRole('tab', { name: 'コード例' });
    fireEvent.click(codeTab);

    expect(screen.getByText(/import { Button } from 'react-aria-components'/)).toBeDefined();

    const descTab = screen.getByRole('tab', { name: '説明' });
    fireEvent.click(descTab);
    expect(screen.getByText(/React Aria Components へようこそ/)).toBeDefined();
  });

  it('copies code to clipboard when clicking copy button', async () => {
    render(<DocsViewer />);
    fireEvent.click(screen.getByRole('tab', { name: 'コード例' }));

    const copyButton = screen.getByRole('button', { name: 'コピー' });
    fireEvent.click(copyButton);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const writeText = vi.mocked(navigator.clipboard.writeText);
    expect(writeText).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('コードをクリップボードにコピーしました！');
  });

  it('navigates to the next and previous pages', () => {
    render(<DocsViewer />);

    // Click Next
    const nextButton = screen.getByRole('button', { name: /次のページ/ });
    fireEvent.click(nextButton);
    expect(screen.getByRole('heading', { name: 'Button コンポーネント' })).toBeDefined();

    // Click Previous
    const prevButton = screen.getByRole('button', { name: /前のページ/ });
    fireEvent.click(prevButton);
    expect(screen.getByRole('heading', { name: 'はじめに' })).toBeDefined();
  });

  it('disables previous button on the first page and next button on the last page', () => {
    render(<DocsViewer />);

    const prevButton = screen.getByRole('button', { name: /前のページ/ });
    const nextButton = screen.getByRole('button', { name: /次のページ/ });

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    // Go to the last page (there are 5 sections)
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: /次のページ/ }));
    }

    expect(nextButton).toBeDisabled();
    expect(prevButton).not.toBeDisabled();
  });

  it('filters out all items in the sidebar when search query matches nothing', () => {
    render(<DocsViewer />);
    const searchInput = screen.getByPlaceholderText('検索...');

    fireEvent.change(searchInput, { target: { value: 'non-existent-query-xyz' } });

    // All options should be gone
    expect(screen.queryByRole('option')).toBeNull();
  });
});
