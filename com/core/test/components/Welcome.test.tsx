/**
 * Welcome Component Test
 *
 * Tests for the com domain Welcome component.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { Welcome } from '../../src/welcome/welcome';

describe('Welcome Component (com)', () => {
  it('should render without crashing', () => {
    const markup = renderToStaticMarkup(<Welcome message="" />);
    expect(markup).toContain('main');
  });

  it('should display the provided message', () => {
    const testMessage = 'Hello from Cloudflare!';
    const markup = renderToStaticMarkup(<Welcome message={testMessage} />);
    expect(markup).toContain(testMessage);
  });

  it('should render React Router logo images', () => {
    const markup = renderToStaticMarkup(<Welcome message="" />);
    expect(markup).toContain('alt="React Router"');
    // Should have both light and dark mode images
    expect(markup).toContain('dark:hidden');
    expect(markup).toContain('dark:block');
  });

  it('should render navigation with guidance text', () => {
    const markup = renderToStaticMarkup(<Welcome message="" />);
    // Check for key words instead of exact text with apostrophe encoding
    expect(markup).toContain('What');
    expect(markup).toContain('next');
  });

  it('should render React Router Docs link', () => {
    const markup = renderToStaticMarkup(<Welcome message="" />);
    expect(markup).toContain('https://reactrouter.com/docs');
    expect(markup).toContain('React Router Docs');
  });

  it('should render Discord link', () => {
    const markup = renderToStaticMarkup(<Welcome message="" />);
    expect(markup).toContain('https://rmx.as/discord');
    expect(markup).toContain('Join Discord');
  });

  it('should have external link attributes', () => {
    const markup = renderToStaticMarkup(<Welcome message="" />);
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
  });

  it('should render SVG icons for links', () => {
    const markup = renderToStaticMarkup(<Welcome message="" />);
    expect(markup).toContain('<svg');
    expect(markup).toContain('React Router Documentation');
    expect(markup).toContain('Join Discord Community');
  });

  it('should handle empty message gracefully', () => {
    const markup = renderToStaticMarkup(<Welcome message="" />);
    expect(markup).toBeDefined();
    expect(markup.length).toBeGreaterThan(0);
  });

  it('should render message in the list', () => {
    const testMessage = 'Custom message here';
    const markup = renderToStaticMarkup(<Welcome message={testMessage} />);
    // Message should be in a list item
    expect(markup).toContain('<li');
    expect(markup).toContain(testMessage);
  });
});
