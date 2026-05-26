import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import HomePage from '../src/app/page';

describe('dev/core pages render without throwing', () => {
  it('home page renders', () => {
    const element = HomePage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });
});
