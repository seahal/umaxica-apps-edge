// @ts-ignore
import '../../test-setup.ts';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Account, * as AccountModule from '../../src/routes/configurations/account';

describe('Account configuration route', () => {
  it('renders account settings title and description', () => {
    render(<Account />);

    expect(screen.getByText('アカウント設定')).toBeInTheDocument();
    expect(screen.getByText('メールアドレスや地域の設定を変更できます')).toBeInTheDocument();
  });

  it('allows changing email address in the input', async () => {
    const user = userEvent.setup();
    render(<Account />);

    const emailInput = screen.getByLabelText('メールアドレス');
    await user.clear(emailInput);
    await user.type(emailInput, 'new@example.com');

    expect(emailInput).toHaveValue('new@example.com');
  });

  it('shows an alert when clicking the change email button', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('alert', vi.fn());
    render(<Account />);

    const button = screen.getByRole('button', { name: 'メールアドレスを変更' });
    await user.click(button);

    expect(window.alert).toHaveBeenCalled();
  });

  it('allows selecting a region', async () => {
    const user = userEvent.setup();
    render(<Account />);

    const usRadio = screen.getByLabelText('アメリカ合衆国');
    await user.click(usRadio);

    expect(usRadio).toBeChecked();
  });

  it('opens the delete account dialog and handles delete', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('alert', vi.fn());
    render(<Account />);

    const deleteButton = screen.getByRole('button', { name: 'アカウントを削除' });
    await user.click(deleteButton);

    expect(screen.getByText('アカウントを削除しますか？')).toBeInTheDocument();

    const confirmDeleteButton = screen.getByRole('button', { name: '削除する' });
    await user.click(confirmDeleteButton);

    expect(window.alert).toHaveBeenCalledWith('アカウント削除機能は現在デモモードです');
  });

  it('meta function returns correct title and description', () => {
    const result = AccountModule.meta({} as never);
    expect(result).toContainEqual({ title: 'Umaxica - アカウント設定' });
    expect(result).toContainEqual({ content: 'アカウント情報の管理', name: 'description' });
  });

  it('clicking cancel button goes back in history', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('alert', vi.fn());
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    vi.stubGlobal('history', { back: backSpy } as unknown as History);

    render(<Account />);

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    await user.click(cancelButton);

    expect(backSpy).toHaveBeenCalled();

    backSpy.mockRestore();
  });

  it('clicking save button shows success alert', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('alert', vi.fn());

    render(<Account />);

    const saveButton = screen.getByRole('button', { name: '変更を保存' });
    await user.click(saveButton);

    expect(window.alert).toHaveBeenCalledWith('設定を保存しました！');
  });
});
