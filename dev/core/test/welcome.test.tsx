import { render, screen } from '@testing-library/react';
import { Welcome } from '../src/welcome/welcome';

describe('Welcome component (dev/core)', () => {
  it('renders welcome page with logo images', () => {
    render(<Welcome />);

    const logos = screen.getAllByAltText('React Router');
    expect(logos).toHaveLength(2);
    expect(logos[0]).toHaveClass('block', 'w-full', 'dark:hidden');
    expect(logos[1]).toHaveClass('hidden', 'w-full', 'dark:block');
  });

  it("renders 'What's next?' text", () => {
    render(<Welcome />);

    expect(screen.getByText("What's next?")).toBeInTheDocument();
  });

  it('renders React Router Docs link', () => {
    render(<Welcome />);

    const docsLink = screen.getByRole('link', { name: /React Router Docs/ });
    expect(docsLink).toBeInTheDocument();
    expect(docsLink).toHaveAttribute('href', 'https://reactrouter.com/docs');
    expect(docsLink).toHaveAttribute('target', '_blank');
  });

  it('renders Join Discord link', () => {
    render(<Welcome />);

    const discordLink = screen.getByRole('link', { name: /Join Discord/ });
    expect(discordLink).toBeInTheDocument();
    expect(discordLink).toHaveAttribute('href', 'https://rmx.as/discord');
    expect(discordLink).toHaveAttribute('target', '_blank');
  });
});
