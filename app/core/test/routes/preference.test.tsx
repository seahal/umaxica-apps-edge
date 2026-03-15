// @ts-ignore
import '../../test-setup.ts';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Preference, * as PreferenceModule from '../../src/routes/configurations/preference';

describe('Preference configuration route', () => {
  it('renders preference settings title and description', () => {
    render(<Preference />);

    expect(screen.getByText('環境設定')).toBeInTheDocument();
    expect(screen.getByText('アプリの表示や動作に関する設定を変更できます')).toBeInTheDocument();
  });

  it('allows toggling dark mode switch', async () => {
    const user = userEvent.setup();
    render(<Preference />);

    const darkModeSwitch = screen.getByRole('switch', { name: 'ダークモード' });
    expect(darkModeSwitch).toBeInTheDocument();
    expect(darkModeSwitch).not.toBeChecked();

    await user.click(darkModeSwitch);
    expect(darkModeSwitch).toBeChecked();
  });

  it('allows selecting a language from the list', async () => {
    const user = userEvent.setup();
    render(<Preference />);

    const langButton = screen.getByRole('button', { name: '日本語' });
    await user.click(langButton);

    // ListBox items should be visible now
    const englishOption = screen.getByRole('option', { name: 'English' });
    await user.click(englishOption);

    // Button text should update
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
  });

  it('allows selecting a timezone', async () => {
    const user = userEvent.setup();
    render(<Preference />);

    const tzButton = screen.getByRole('button', { name: /Asia\/Tokyo/ });
    await user.click(tzButton);

    const nyOption = screen.getByRole('option', { name: /America\/New_York/ });
    await user.click(nyOption);

    expect(screen.getByRole('button', { name: /America\/New_York/ })).toBeInTheDocument();
  });

  it('shows an alert when clicking the save button', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('alert', vi.fn());
    render(<Preference />);

    const saveButton = screen.getByRole('button', { name: '変更を保存' });
    await user.click(saveButton);

    expect(window.alert).toHaveBeenCalledWith('設定を保存しました！');
  });

  it('meta function returns correct title and description', () => {
    const result = PreferenceModule.meta({} as never);
    expect(result).toContainEqual({ title: 'Umaxica - 環境設定' });
    expect(result).toContainEqual({ content: '表示や動作に関する設定', name: 'description' });
  });

  it('clicking cancel button goes back in history', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('alert', vi.fn());
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});

    render(<Preference />);

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    await user.click(cancelButton);

    expect(backSpy).toHaveBeenCalled();

    backSpy.mockRestore();
  });
});
