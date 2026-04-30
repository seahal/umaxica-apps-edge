/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { renderer } from '../renderer';
import { describe, expect, it } from 'vite-plus/test';

describe('renderer', () => {
  it('renders HTML with proper structure', async () => {
    const app = new Hono();
    app.use(renderer);
    app.get('/test', (c) => c.render(<div>Test Content</div>));

    const response = await app.request('/test', {}, { BRAND_NAME: 'TestBrand' });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('<html lang="ja">');
    expect(body).toContain('<meta charSet="utf-8"');
    expect(body).toContain('<title>TestBrand</title>');
    expect(body).toContain('Test Content');
  });

  it('uses current year in footer', async () => {
    const app = new Hono();
    app.use(renderer);
    app.get('/test', (c) => c.render(<div>Test</div>));

    const response = await app.request('/test', {}, { BRAND_NAME: 'TestBrand' });
    const body = await response.text();

    const currentYear = new Date().getUTCFullYear();
    expect(body).toContain(`© ${currentYear} TestBrand`);
  });

  it('uses default brand name when BRAND_NAME env is not set', async () => {
    const app = new Hono();
    app.use(renderer);
    app.get('/test', (c) => c.render(<div>Test</div>));

    const response = await app.request('/test', {}, {});
    const body = await response.text();

    expect(body).toContain('UMAXICA');
  });

  it('includes viewport meta tag', async () => {
    const app = new Hono();
    app.use(renderer);
    app.get('/test', (c) => c.render(<div>Test</div>));

    const response = await app.request('/test', {}, { BRAND_NAME: 'TestBrand' });
    const body = await response.text();

    expect(body).toContain('width=device-width, initial-scale=1.0');
  });

  it('renders header with brand name', async () => {
    const app = new Hono();
    app.use(renderer);
    app.get('/test', (c) => c.render(<div>Test</div>));

    const response = await app.request('/test', {}, { BRAND_NAME: 'TestBrand' });
    const body = await response.text();

    expect(body).toContain('<header');
    expect(body).toContain('TestBrand');
  });

  it('renders main content area with children', async () => {
    const app = new Hono();
    app.use(renderer);
    app.get('/test', (c) => c.render(<div data-testid="content">Content</div>));

    const response = await app.request('/test', {}, { BRAND_NAME: 'TestBrand' });
    const body = await response.text();

    expect(body).toContain('<main');
    expect(body).toContain('Content');
  });

  it('renders footer with copyright', async () => {
    const app = new Hono();
    app.use(renderer);
    app.get('/test', (c) => c.render(<div>Test</div>));

    const response = await app.request('/test', {}, { BRAND_NAME: 'TestBrand' });
    const body = await response.text();

    expect(body).toContain('<footer');
    expect(body).toContain('©');
  });
});
