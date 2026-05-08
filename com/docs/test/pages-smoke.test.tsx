import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import RootPage from '../src/app/page';
import LocalePage from '../src/app/[locale]/page';

describe('com/docs pages render without throwing', () => {
  it('root page renders', async () => {
    const element = await RootPage();
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });

  it('[locale] page renders', async () => {
    const element = await LocalePage({ params: Promise.resolve({ locale: 'en' }) });
    const html = renderToStaticMarkup(element);
    expect(html).not.toBe('');
  });
});
