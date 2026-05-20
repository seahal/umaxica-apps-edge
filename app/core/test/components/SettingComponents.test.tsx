// @ts-ignore
import '../../test-setup.ts';

import { render, screen } from '@testing-library/react';

import { SettingItem, SettingLayout, SettingSection } from '../../src/components/SettingComponents';

describe('SettingComponents', () => {
  it('renders SettingLayout without description', () => {
    render(
      <SettingLayout title="設定">
        <div>Content</div>
      </SettingLayout>,
    );

    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders SettingSection without description', () => {
    render(
      <SettingSection title="セクション">
        <div>Content</div>
      </SettingSection>,
    );

    expect(screen.getByRole('heading', { name: 'セクション' })).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders SettingItem without description', () => {
    render(
      <SettingItem label="通知">
        <button type="button">Toggle</button>
      </SettingItem>,
    );

    expect(screen.getByText('通知')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('renders multiple SettingSections', () => {
    render(
      <SettingLayout title="設定">
        <SettingSection title="プライバシー">
          <div>Privacy content</div>
        </SettingSection>
        <SettingSection title="通知">
          <div>Notification content</div>
        </SettingSection>
      </SettingLayout>,
    );

    expect(screen.getByRole('heading', { name: 'プライバシー' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '通知' })).toBeInTheDocument();
    expect(screen.getByText('Privacy content')).toBeInTheDocument();
    expect(screen.getByText('Notification content')).toBeInTheDocument();
  });

  it('renders SettingItem with long description', () => {
    const longDescription =
      'This is a very long description that explains the setting in detail. It should wrap properly and display correctly.';

    render(
      <SettingItem label="詳細設定" description={longDescription}>
        <input type="checkbox" />
      </SettingItem>,
    );

    expect(screen.getByText('詳細設定')).toBeInTheDocument();
    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });
});
