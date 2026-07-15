import { describe, expect, it } from 'vitest';
import { sharedImageConfig } from './image-config';

describe('sharedImageConfig', () => {
  it('enables AVIF and WebP output formats', () => {
    expect(sharedImageConfig.formats).toEqual(['image/avif', 'image/webp']);
  });

  it('restricts qualities to the allowlisted value', () => {
    expect(sharedImageConfig.qualities).toEqual([75]);
  });

  it('allows no remote image hosts by default', () => {
    expect(sharedImageConfig.remotePatterns).toEqual([]);
  });

  it('does not allow SVG optimization', () => {
    expect(sharedImageConfig.dangerouslyAllowSVG).toBe(false);
  });

  it('forces attachment content-disposition', () => {
    expect(sharedImageConfig.contentDispositionType).toBe('attachment');
  });
});
