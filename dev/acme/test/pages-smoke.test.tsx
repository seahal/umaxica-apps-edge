import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from '../src/app/page';

describe('dev/acme pages render without throwing', () => {
  it('home page renders', () => {
    const element = HomePage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });
});
