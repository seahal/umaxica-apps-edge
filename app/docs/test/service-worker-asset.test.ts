import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('service worker asset', () => {
  it('uses network failure only for the offline fallback', () => {
    const worker = readFileSync(
      resolve(import.meta.dirname, '..', 'public/service-worker.js'),
      'utf8',
    );
    expect(worker).toContain("const OFFLINE_URLS = ['/offline', '/offline/']");
    expect(worker).not.toContain('response.ok');
  });
});
