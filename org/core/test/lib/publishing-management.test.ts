import { describe, expect, it } from 'vitest';

import {
  PUBLISHING_AUDIENCES,
  PUBLISHING_CELLS,
  PUBLISHING_SURFACES,
  managementEditUrl,
  managementIndexUrl,
} from '@/lib/publishing-management';
import { parseRailsStaffOrigin } from '@/lib/rails-staff-origin';

const ORIGIN = 'https://www.umaxica.org';

describe('Rails staff origin', () => {
  it('fails closed rather than constructing an invalid origin', () => {
    expect(parseRailsStaffOrigin(ORIGIN)).toBe(ORIGIN);
    expect(() => parseRailsStaffOrigin(undefined)).toThrow(/not configured/u);
    expect(() => parseRailsStaffOrigin('')).toThrow(/not configured/u);
    expect(() => parseRailsStaffOrigin('not a url')).toThrow(/not a valid URL/u);
    expect(() => parseRailsStaffOrigin('http://news.org.localhost:3000')).toThrow(/VPC/u);
    expect(() => parseRailsStaffOrigin('http://core.org.localhost:3000')).toThrow(/VPC/u);
  });

  it('rejects credentials, non-http schemes, paths, and query fragments', () => {
    expect(() => parseRailsStaffOrigin('ftp://www.umaxica.org')).toThrow(/http\(s\)/u);
    expect(() => parseRailsStaffOrigin('https://user:pass@www.umaxica.org')).toThrow(
      /credentials/u,
    );
    expect(() => parseRailsStaffOrigin('https://www.umaxica.org/staff')).toThrow(/no path/u);
    expect(() => parseRailsStaffOrigin('https://www.umaxica.org?x=1')).toThrow(
      /query or fragment/u,
    );
    expect(() => parseRailsStaffOrigin('https://www.umaxica.org#x')).toThrow(/query or fragment/u);
  });
});

describe('publishing management URLs', () => {
  it('covers all 12 cells with public_id member identity', () => {
    expect(PUBLISHING_CELLS).toHaveLength(12);
    expect(PUBLISHING_SURFACES).toEqual(['info', 'docs', 'news', 'help']);
    expect(PUBLISHING_AUDIENCES).toEqual(['app', 'com', 'org']);

    for (const { surface, audience } of PUBLISHING_CELLS) {
      const index = managementIndexUrl(ORIGIN, surface, audience);
      expect(index).toBe(`${ORIGIN}/publishing/${surface}/${audience}/entries`);
      const edit = managementEditUrl(ORIGIN, surface, audience, '01ABC');
      expect(edit).toBe(`${ORIGIN}/publishing/${surface}/${audience}/entries/01ABC/edit`);
      expect(edit).not.toContain('slug');
      expect(edit).not.toMatch(/\/\d+\/edit$/u);
    }
  });

  it('rejects an unknown publishing cell before building a URL', () => {
    expect(() =>
      managementIndexUrl(ORIGIN, 'blog' as (typeof PUBLISHING_SURFACES)[number], 'app'),
    ).toThrow(/unknown publishing cell/u);
    expect(() =>
      managementEditUrl(ORIGIN, 'info', 'net' as (typeof PUBLISHING_AUDIENCES)[number], '01ABC'),
    ).toThrow(/unknown publishing cell/u);
  });

  it('requires a non-empty public_id for edit URLs', () => {
    expect(() => managementEditUrl(ORIGIN, 'info', 'app', '')).toThrow(/public_id is required/u);
  });
});
