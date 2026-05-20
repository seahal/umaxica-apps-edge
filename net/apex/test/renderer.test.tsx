/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { renderer } from '../src/renderer';

describe('Renderer layout', () => {
  const app = new Hono();
  app.use(renderer);
  app.get('/', (c) => c.render(<p>Test content</p>));

  it('renders full HTML document structure', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toContain('<html');
    expect(body).toContain('</html>');
    expect(body).toContain('<head');
    expect(body).toContain('<body');
  });

  it('renders header with UMAXICA title', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toContain('<header');
    expect(body).toContain('UMAXICA');
  });

  it('renders header title from BRAND_NAME env', async () => {
    const res = await app.request('/', {}, { BRAND_NAME: 'UMAXCA' });
    const body = await res.text();
    expect(body).toContain('UMAXCA');
    expect(body).toContain('<title>UMAXCA</title>');
  });

  it('renders children in main element', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toContain('<main');
    expect(body).toContain('Test content');
  });

  it('includes Footer component', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toContain('<footer');
    const currentYear = new Date().getUTCFullYear();
    expect(body).toContain(`© ${currentYear} UMAXICA`);
  });

  it('sets lang attribute to ja', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toContain('lang="ja"');
  });

  it('includes viewport meta tag', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toContain('viewport');
    expect(body).toContain('width=device-width');
  });

  it('includes meta description for homepage rendering', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toContain('name="description"');
    expect(body).toContain('This domain does not provide services for end users.');
  });
});
