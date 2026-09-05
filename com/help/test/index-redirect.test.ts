import { describe, expect, it } from 'vitest';

import { GET } from '../src/pages/index';

describe('language negotiation at /', () => {
  it('redirects to /ja/ when Accept-Language prefers Japanese', async () => {
    const response = await GET({
      request: new Request('https://example.test/', {
        headers: { 'accept-language': 'ja,en;q=0.8' },
      }),
      url: new URL('https://example.test/'),
    } as never);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.test/ja/');
    expect(response.headers.get('vary')).toBe('Accept-Language');
  });

  it('redirects to /en/ when Accept-Language prefers English', async () => {
    const response = await GET({
      request: new Request('https://example.test/', {
        headers: { 'accept-language': 'en-US' },
      }),
      url: new URL('https://example.test/'),
    } as never);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.test/en/');
  });
});
