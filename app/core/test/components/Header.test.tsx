// @ts-ignore
import '../../test-setup.ts';

import { createRoutesStub } from 'react-router';
import { Header } from '../../src/components/Header';

const { render, screen } = await import('@testing-library/react');

function renderHeader(props: Partial<Parameters<typeof Header>[0]> = {}, initialPath = '/') {
  const Stub = createRoutesStub([
    {
      Component: () => <Header {...(props as Parameters<typeof Header>[0])} />,
      path: '*',
    },
  ]);
  return render(<Stub initialEntries={[initialPath]} />);
}

describe('Header component', () => {
  it('renders branding with fallback code name', () => {
    renderHeader();

    expect(screen.getByText('Umaxica', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByTitle('Umaxica')).toBeInTheDocument();
  });

  it('applies active styles to current navigation link', () => {
    renderHeader({}, '/message');

    const messageLink = screen.getByRole('link', { name: '💬' });
    expect(messageLink.className).toContain('scale-110');
  });

  it('renders external service links when URLs provided', () => {
    renderHeader({
      docsServiceUrl: 'docs.umaxica.app',
      helpServiceUrl: 'help.umaxica.app',
      newsServiceUrl: 'news.umaxica.app',
    });

    expect(screen.getByRole('link', { name: '📰' })).toHaveAttribute(
      'href',
      'https://news.umaxica.app',
    );
    expect(screen.getByRole('link', { name: '📚' })).toHaveAttribute(
      'href',
      'https://docs.umaxica.app',
    );
    expect(screen.getByRole('link', { name: '❓' })).toHaveAttribute(
      'href',
      'https://help.umaxica.app',
    );
  });

  it('renders custom code name when provided', () => {
    renderHeader({ codeName: 'MyApp' });

    const myAppElements = screen.getAllByText('MyApp');
    expect(myAppElements.length).toBeGreaterThan(0);
    const titleElements = screen.getAllByTitle('MyApp');
    expect(titleElements.length).toBeGreaterThan(0);
  });

  it('renders all navigation links', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: '💬' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '🔔' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '⚙️' })).toBeInTheDocument();
  });

  it('renders Explore and Login buttons', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: /Explore/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login/ })).toBeInTheDocument();
  });

  it('applies active styles to notification link when active', () => {
    renderHeader({}, '/notification');

    const notificationLink = screen.getByRole('link', { name: '🔔' });
    expect(notificationLink.className).toContain('scale-110');
  });

  it('applies active styles to configuration link when active', () => {
    renderHeader({}, '/configuration');

    const configLink = screen.getByRole('link', { name: '⚙️' });
    expect(configLink.className).toContain('scale-110');
  });

  it('applies active styles to explore link when active', () => {
    renderHeader({}, '/explore');

    const exploreLink = screen.getByRole('link', { name: /Explore/ });
    expect(exploreLink.className).toContain('bg-blue-600');
  });

  it('applies active styles to authentication link when active', () => {
    renderHeader({}, '/authentication');

    const authLink = screen.getByRole('link', { name: /Login/ });
    expect(authLink.className).toContain('bg-blue-600');
  });

  it('renders logo link to home page', () => {
    renderHeader();

    const logoLink = screen.getByRole('link', { name: /Umaxica/ });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('renders all internal navigation links with correct paths', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: '💬' })).toHaveAttribute('href', '/message');
    expect(screen.getByRole('link', { name: '🔔' })).toHaveAttribute('href', '/notification');
    expect(screen.getByRole('link', { name: '⚙️' })).toHaveAttribute('href', '/configuration');
    expect(screen.getByRole('link', { name: /Explore/ })).toHaveAttribute('href', '/explore');
    expect(screen.getByRole('link', { name: /Login/ })).toHaveAttribute('href', '/authentication');
  });

  it('renders external links with target blank and noopener', () => {
    renderHeader({
      newsServiceUrl: 'news.umaxica.app',
    });

    const newsLink = screen.getByRole('link', { name: '📰' });
    expect(newsLink).toHaveAttribute('target', '_blank');
    expect(newsLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
