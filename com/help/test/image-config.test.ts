import { describe, expect, it } from 'vitest';
import { imageConfig } from '../image-config';

describe('imageConfig', () => {
  it('enables AVIF and WebP output formats', () => {
    expect(imageConfig.formats).toEqual(['image/avif', 'image/webp']);
  });

  it('restricts qualities to the allowlisted value', () => {
    expect(imageConfig.qualities).toEqual([75]);
  });

  it('allows no remote image hosts by default', () => {
    expect(imageConfig.remotePatterns).toEqual([]);
  });

  it('does not allow SVG optimization', () => {
    expect(imageConfig.dangerouslyAllowSVG).toBe(false);
  });

  it('forces attachment content-disposition', () => {
    expect(imageConfig.contentDispositionType).toBe('attachment');
  });
});
