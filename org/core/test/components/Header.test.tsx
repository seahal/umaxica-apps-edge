import '../../test-setup.ts';

import { MemoryRouter } from 'react-router';
import { Header } from '../../src/components/Header';

const { render, screen } = await import('@testing-library/react');

function renderHeader(props: Partial<Parameters<typeof Header>[0]> = {}, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Header {...(props as Parameters<typeof Header>[0])} />
    </MemoryRouter>,
  );
}

describe('Header component', () => {
  it('renders branding with fallback code name', () => {
    renderHeader();

    expect(screen.getByText('Umaxica', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByTitle('Umaxica')).toBeInTheDocument();
  });

  it('renders custom code name when provided', () => {
    renderHeader({ codeName: 'OrgApp' });

    expect(screen.getAllByText('OrgApp').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('OrgApp').length).toBeGreaterThan(0);
  });

  it('renders all navigation links', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: '💬' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '⚙️' })).toBeInTheDocument();
  });

  it('renders notification as external link', () => {
    renderHeader();

    const notificationLink = screen.getByRole('link', { name: '🔔' });
    expect(notificationLink).toHaveAttribute('href', 'https://jp.help.umaxica.org/notifications');
    expect(notificationLink).toHaveAttribute('target', '_blank');
  });

  it('renders Explore and Login buttons', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: /Explore/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login/ })).toBeInTheDocument();
  });

  it('renders external service links when URLs provided', () => {
    renderHeader({
      docsServiceUrl: 'docs.umaxica.org',
      helpServiceUrl: 'help.umaxica.org',
      newsServiceUrl: 'news.umaxica.org',
    });

    expect(screen.getByRole('link', { name: '📰' })).toHaveAttribute(
      'href',
      'https://news.umaxica.org',
    );
    expect(screen.getByRole('link', { name: '📚' })).toHaveAttribute(
      'href',
      'https://docs.umaxica.org',
    );
    expect(screen.getByRole('link', { name: '❓' })).toHaveAttribute(
      'href',
      'https://help.umaxica.org',
    );
  });

  it('does not render external links when URLs are not provided', () => {
    renderHeader();

    expect(screen.queryByRole('link', { name: '📰' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '📚' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '❓' })).not.toBeInTheDocument();
  });

  it('applies active styles to message link when active', () => {
    renderHeader({}, '/message');

    const messageLink = screen.getByRole('link', { name: '💬' });
    expect(messageLink.className).toContain('scale-110');
  });

  it('applies active styles to explore link when active', () => {
    renderHeader({}, '/explore');

    const exploreLink = screen.getByRole('link', { name: /Explore/ });
    expect(exploreLink.className).toContain('bg-blue-600');
  });

  it('applies active styles to configuration link when active', () => {
    renderHeader({}, '/configuration');

    const configLink = screen.getByRole('link', { name: '⚙️' });
    expect(configLink.className).toContain('scale-110');
  });

  it('applies active styles to authentication link when active', () => {
    renderHeader({}, '/authentication');

    const authLink = screen.getByRole('link', { name: /Login/ });
    expect(authLink.className).toContain('bg-blue-600');
  });
});
