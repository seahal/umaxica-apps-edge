import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('service worker asset', () => {
  it('serves only a fixed offline document for eligible navigation failures', () => {
    const worker = readFileSync(
      resolve(import.meta.dirname, '..', 'public/service-worker.js'),
      'utf8',
    );
    expect(worker).toContain("const CACHE_NAME = 'umaxica-offline-v2'");
    expect(worker).toContain("const OFFLINE_URL = '/offline'");
    expect(worker).toContain('<!doctype html>');
    expect(worker).toContain('content-security-policy');
    expect(worker).toContain('cache.put(OFFLINE_URL, createOfflineResponse())');
    expect(worker).toContain('key === LEGACY_CACHE_NAME');
    expect(worker).toContain('key.startsWith(CACHE_PREFIX)');
    expect(worker).toContain("request.method !== 'GET'");
    expect(worker).toContain("request.mode !== 'navigate'");
    expect(worker).toContain('url.origin !== self.location.origin');
    expect(worker).toContain("'/api/'");
    expect(worker).toContain("'/oidc/'");
    expect(worker).toContain("'/sign/out'");
    expect(worker).not.toContain('response.ok');
    expect(worker).not.toContain('cache.add(OFFLINE_URL)');
    expect(worker).not.toContain('cache.put(event.request');
    expect(worker).not.toContain('keys.filter((key) => key !== CACHE_NAME)');
    expect(worker.split('cache.put(')).toHaveLength(2);
  });
});
