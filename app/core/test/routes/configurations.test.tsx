// @ts-ignore
import '../../test-setup.ts';

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

vi.mock('react-router', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => createElement('a', { href: to as string, ...rest }, children),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => createElement('a', { href: to as string, ...rest }, children),
  };
});

const configModule = await import('../../src/routes/configurations/_index');
const ConfigurationIndex = configModule.default;

describe('Configurations route', () => {
  it('renders settings page title and description', () => {
    const markup = renderToStaticMarkup(
      <ConfigurationIndex loaderData={{ message: '' }} params={{}} matches={[]} />,
    );

    expect(markup).toContain('設定');
    expect(markup).toContain('アカウントや表示設定を管理します');
  });

  it('renders account settings menu item', () => {
    const markup = renderToStaticMarkup(
      <ConfigurationIndex loaderData={{ message: '' }} params={{}} matches={[]} />,
    );

    expect(markup).toContain('アカウント');
    expect(markup).toContain('メールアドレス、地域設定、アカウント削除');
  });

  it('renders preference settings menu item', () => {
    const markup = renderToStaticMarkup(
      <ConfigurationIndex loaderData={{ message: '' }} params={{}} matches={[]} />,
    );

    expect(markup).toContain('環境設定');
    expect(markup).toContain('言語、タイムゾーン、テーマ、アクセシビリティ');
  });

  it('renders account link with correct href', () => {
    const markup = renderToStaticMarkup(
      <ConfigurationIndex loaderData={{ message: '' }} params={{}} matches={[]} />,
    );

    expect(markup).toContain('href="/configuration/account"');
  });

  it('renders preference link with correct href', () => {
    const markup = renderToStaticMarkup(
      <ConfigurationIndex loaderData={{ message: '' }} params={{}} matches={[]} />,
    );

    expect(markup).toContain('href="/configuration/preference"');
  });

  it('renders debug info when message is present in loader data', () => {
    const markup = renderToStaticMarkup(
      <ConfigurationIndex loaderData={{ message: 'test-secret-value' }} params={{}} matches={[]} />,
    );

    expect(markup).toContain('環境変数:');
    expect(markup).toContain('test-secret-value');
  });

  it('does not render debug info when message is empty', () => {
    const markup = renderToStaticMarkup(
      <ConfigurationIndex loaderData={{ message: '' }} params={{}} matches={[]} />,
    );

    expect(markup).not.toContain('環境変数:');
  });

  it('meta function returns correct title', () => {
    const result = configModule.meta({} as never);
    expect(result).toContainEqual({ title: 'Umaxica - 設定' });
    expect(result).toContainEqual({ content: 'アカウントと環境設定', name: 'description' });
  });
});
