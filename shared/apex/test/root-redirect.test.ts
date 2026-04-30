import { describe, expect, it } from 'vite-plus/test';
import { createRootRedirect } from '../root-redirect';

describe('createRootRedirect', () => {
  it('creates redirect functions', () => {
    const { resolveRedirectUrl, getDefaultRedirectUrl, buildRegionErrorPayload } =
      createRootRedirect('example.com');

    expect(typeof resolveRedirectUrl).toBe('function');
    expect(typeof getDefaultRedirectUrl).toBe('function');
    expect(typeof buildRegionErrorPayload).toBe('function');
  });

  describe('resolveRedirectUrl', () => {
    it('resolves valid jp region', () => {
      const { resolveRedirectUrl } = createRootRedirect('example.com');
      expect(resolveRedirectUrl('jp')).toBe('https://jp.example.com/');
      expect(resolveRedirectUrl('JP')).toBe('https://jp.example.com/');
    });

    it('resolves valid us region', () => {
      const { resolveRedirectUrl } = createRootRedirect('example.com');
      expect(resolveRedirectUrl('us')).toBe('https://us.example.com/');
      expect(resolveRedirectUrl('US')).toBe('https://us.example.com/');
    });

    it('returns null for invalid region', () => {
      const { resolveRedirectUrl } = createRootRedirect('example.com');
      expect(resolveRedirectUrl('eu')).toBeNull();
      expect(resolveRedirectUrl('invalid')).toBeNull();
    });

    it('returns null for null/undefined/empty region', () => {
      const { resolveRedirectUrl } = createRootRedirect('example.com');
      expect(resolveRedirectUrl(null)).toBeNull();
      expect(resolveRedirectUrl(undefined)).toBeNull();
      expect(resolveRedirectUrl('')).toBeNull();
    });
  });

  describe('getDefaultRedirectUrl', () => {
    it('returns default jp redirect', () => {
      const { getDefaultRedirectUrl } = createRootRedirect('example.com');
      expect(getDefaultRedirectUrl()).toBe('https://jp.example.com/');
    });
  });

  describe('buildRegionErrorPayload', () => {
    it('returns error payload', () => {
      const { buildRegionErrorPayload } = createRootRedirect('example.com');
      const payload = buildRegionErrorPayload();
      expect(payload).toEqual({
        error: 'region_not_supported',
        message: 'Unable to determine a safe redirect target',
      });
    });
  });
});
