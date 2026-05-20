// @ts-ignore
// @ts-ignore
import '../test-setup.ts';

import { Welcome } from '../src/welcome/welcome';

const { render, screen } = await import('@testing-library/react');

describe('Welcome component', () => {
  it('renders provided message and resource links', () => {
    render(<Welcome message="環境変数の値" />);

    expect(screen.getByText('環境変数の値')).toBeInTheDocument();
    const images = screen.getAllByAltText('React Router');
    expect(images.length).toBeGreaterThan(0);

    const links = screen.getAllByRole('link');
    expect(links.some((link) => link.textContent?.includes('React Router Docs'))).toBeTruthy();
  });
});
