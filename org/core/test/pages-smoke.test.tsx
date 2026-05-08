import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { redirect } from 'next/navigation';
import RootPage from '../src/app/(page)/page';
import AboutPage from '../src/app/(page)/about/page';
import ExplorePage from '../src/app/(page)/explore/page';
import DoctorPage from '../src/app/(page)/doctor/page';
import NotificationsPage from '../src/app/(page)/notifications/page';
import MessagesPage from '../src/app/(page)/messages/page';
import ConfigurationPage from '../src/app/(page)/configuration/page';
import AccountPage from '../src/app/(page)/configuration/account/page';
import PreferencePage from '../src/app/(page)/configuration/preference/page';
import HomePage from '../src/app/(page)/home/page';

vi.mock('next/navigation', () => ({
  redirect: vi.fn<() => never>(),
}));

vi.mock('@/i18n/config', () => ({
  defaultLocale: 'en',
}));

vi.mock('@/i18n/dictionaries', () => ({
  getDictionary: vi.fn<() => Promise<Record<string, unknown>>>().mockResolvedValue({
    home: {
      title: 'Home',
      description: 'Welcome to our website',
    },
    about: { title: 'About' },
    explore: { title: 'Explore' },
    doctor: { title: 'Doctor' },
    notifications: { title: 'Notifications', wip: 'WIP' },
    messages: { title: 'Messages', wip: 'WIP' },
    configuration: { title: 'Configuration' },
    configuration_account: { title: 'Account' },
    configuration_preference: { title: 'Preference' },
  }),
}));

describe('org/core pages render without throwing', () => {
  it('root page renders', async () => {
    const element = await RootPage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('about page renders', async () => {
    const element = await AboutPage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('explore page renders', async () => {
    const element = await ExplorePage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('doctor page renders', async () => {
    const element = await DoctorPage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('notifications page renders', async () => {
    const element = await NotificationsPage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('messages page renders', async () => {
    const element = await MessagesPage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('configuration page renders', async () => {
    const element = await ConfigurationPage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('account page renders', async () => {
    const element = await AccountPage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('preference page renders', async () => {
    const element = await PreferencePage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('home page redirects to root', () => {
    HomePage();
    expect(redirect).toHaveBeenCalledWith('/');
  });
});
