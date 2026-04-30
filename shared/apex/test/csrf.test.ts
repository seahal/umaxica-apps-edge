import { Hono } from 'hono';
import { apexCsrf, isAllowedApexOrigin } from '../csrf';
import { apexCsrfMiddleware } from '../middleware/csrf';

describe('apex CSRF config', () => {
  it('validates production and localhost apex origins', () => {
    expect(isAllowedApexOrigin('https://umaxica.com')).toBe(true);
    expect(isAllowedApexOrigin('https://umaxica.org')).toBe(true);
    expect(isAllowedApexOrigin('https://umaxica.app')).toBe(true);
    expect(isAllowedApexOrigin('https://umaxica.net')).toBe(true);
    expect(isAllowedApexOrigin('http://app.localhost:3333')).toBe(true);
    expect(isAllowedApexOrigin('https://evil.example')).toBe(false);
    expect(isAllowedApexOrigin(undefined)).toBe(false);
  });

  it('allows preview/staging origins on workers.dev', () => {
    expect(isAllowedApexOrigin('https://abc123.com-apex.workers.dev')).toBe(true);
    expect(isAllowedApexOrigin('https://preview-branch.app-apex.workers.dev')).toBe(true);
    expect(isAllowedApexOrigin('http://abc123.com-apex.workers.dev')).toBe(false);
    expect(isAllowedApexOrigin('https://workers.dev')).toBe(false);
  });

  it('allows all local origins without port', () => {
    expect(isAllowedApexOrigin('http://com.localhost')).toBe(true);
    expect(isAllowedApexOrigin('http://org.localhost')).toBe(true);
    expect(isAllowedApexOrigin('http://app.localhost')).toBe(true);
    expect(isAllowedApexOrigin('http://net.localhost')).toBe(true);
  });

  it('rejects empty string origin', () => {
    expect(isAllowedApexOrigin('')).toBe(false);
  });

  describe('apexCsrfMiddleware', () => {
    it('rejects POST requests from disallowed origins', async () => {
      const app = new Hono();
      app.use('*', apexCsrfMiddleware());
      app.post('/submit', (c) => c.text('ok'));

      const response = await app.request('/submit', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'https://evil.com',
        },
        body: 'test=value',
      });

      expect(response.status).toBe(403);
    });

    it('allows GET requests from allowed origins', async () => {
      const app = new Hono();
      app.use('*', apexCsrfMiddleware());
      app.get('/data', (c) => c.text('data'));

      const response = await app.request('/data', {
        method: 'GET',
        headers: {
          origin: 'https://umaxica.com',
        },
      });

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('data');
    });

    it('rejects POST requests without origin from cross-site', async () => {
      const app = new Hono();
      app.use('*', apexCsrfMiddleware());
      app.post('/submit', (c) => c.text('ok'));

      const response = await app.request('/submit', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'sec-fetch-site': 'cross-site',
        },
        body: 'test=value',
      });

      expect(response.status).toBe(403);
    });
  });

  it('rejects cross-site form POST requests', async () => {
    const app = new Hono();
    app.use('*', apexCsrf);
    app.post('/submit', (c) => c.text('ok'));

    const response = await app.request('/submit', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'sec-fetch-site': 'cross-site',
      },
      body: 'a=1',
    });

    expect(response.status).toBe(403);
  });

  it('allows requests without content-type for GET requests', async () => {
    const app = new Hono();
    app.use('*', apexCsrf);
    app.get('/data', (c) => c.text('data'));

    const response = await app.request('/data', {
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('data');
  });

  it('triggers origin callback in apexCsrf', async () => {
    const app = new Hono();
    // For testing only: set the origin header since we can't set it in Request due to CORS restrictions
    app.use('*', async (c, next) => {
      c.req.raw.headers.set('origin', 'https://umaxica.com');
      await next();
    });
    app.use('*', apexCsrf);
    app.post('/submit', (c) => c.text('ok'));

    const response = await app.request('/submit', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'a=1',
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });
});

describe('apexCsrf export', () => {
  it('is a valid Hono middleware', () => {
    const app = new Hono();
    app.use('*', apexCsrf);
    expect(typeof apexCsrf).toBe('function');
  });
});
