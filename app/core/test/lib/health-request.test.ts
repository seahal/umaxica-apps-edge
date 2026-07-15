import { describe, expect, it } from 'vitest';
import { sanitizeHealthRequest } from '../../src/lib/health-request';

describe('sanitizeHealthRequest', () => {
  it('drops non-ASCII header values while preserving ASCII headers', () => {
    const request = new Request('https://jp.umaxica.com/health', {
      headers: {
        'cf-ipcity': 'Bāshettihalli',
        'user-agent': 'health-probe/1.0',
      },
    });

    const sanitized = sanitizeHealthRequest(request);

    expect(sanitized.headers.has('cf-ipcity')).toBe(false);
    expect(sanitized.headers.get('user-agent')).toBe('health-probe/1.0');
    expect(sanitized.url).toBe(request.url);
    expect(sanitized.method).toBe('GET');
  });
});
