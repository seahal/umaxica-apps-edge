import { describe, expect, it, vi } from 'vitest';

import type * as PublishingCell from '../../src/lib/publishing-cell';

const surfaces = ['docs', 'help', 'info', 'news'] as const;

describe('siteCopy surface factories', () => {
  it.each(surfaces)('builds closed copy for the %s publishing cell', async (surface) => {
    vi.resetModules();
    vi.doMock('../../src/lib/publishing-cell', async (importOriginal) => {
      const actual = (await importOriginal()) as typeof PublishingCell;
      return { ...actual, PUBLISHING_SURFACE: surface };
    });
    const { siteCopy } = await import('../../src/lib/site-copy');
    const copy = siteCopy('ja');
    expect(copy.product.length).toBeGreaterThan(0);
    expect(copy.siteName.length).toBeGreaterThan(0);
    expect(copy.heading.length).toBeGreaterThan(0);
    expect(copy.description.length).toBeGreaterThan(0);
    expect(copy.paragraphs.length).toBeGreaterThan(0);
    expect(copy.aboutParagraphs.length).toBeGreaterThan(0);
  });
});
