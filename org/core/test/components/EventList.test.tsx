import '../../test-setup.ts';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vite-plus/test';

const { EventList } = await import('../../src/components/EventList');

function getRenderedEventTitles() {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent?.trim());
}

describe('EventList component (org)', () => {
  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn());
  });

  it('renders all events by default', () => {
    render(<EventList />);

    expect(getRenderedEventTitles()).toStrictEqual([
      'React Aria ハンズオンワークショップ',
      'Web アクセシビリティカンファレンス 2025',
      'フロントエンド開発者ミートアップ',
      'デザインシステム構築ウェビナー',
    ]);
  });

  it('exposes category filters for each event type', () => {
    render(<EventList />);

    const filters = ['すべて', 'カンファレンス', 'ミートアップ', 'ワークショップ', 'ウェビナー'];

    for (const name of filters) {
      expect(screen.getAllByRole('radio', { name })).not.toHaveLength(0);
    }
  });

  it('opens registration modal when clicking register button', () => {
    render(<EventList />);

    const registerButtons = screen.getAllByRole('button', { name: '参加申し込み' });
    const firstRegisterButton = registerButtons[0];
    expect(firstRegisterButton).toBeDefined();
    if (!firstRegisterButton) {
      throw new Error('register button not found');
    }
    fireEvent.click(firstRegisterButton);

    expect(screen.getByRole('heading', { name: 'イベント参加申し込み' })).toBeDefined();
  });

  it('closes modal when clicking cancel button', () => {
    render(<EventList />);

    const registerButtons = screen.getAllByRole('button', { name: '参加申し込み' });
    const firstRegisterButton = registerButtons[0];
    expect(firstRegisterButton).toBeDefined();
    if (!firstRegisterButton) {
      throw new Error('register button not found');
    }
    fireEvent.click(firstRegisterButton);

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole('heading', { name: 'イベント参加申し込み' })).toBeNull();
  });

  it('shows remaining slots for events', () => {
    render(<EventList />);

    expect(screen.getAllByText(/残り \d+ 枠/).length).toBeGreaterThan(0);
  });
});
