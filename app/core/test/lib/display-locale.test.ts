// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { resolveDisplayLocale } from '../../src/lib/display-locale';

describe('Core URL display locale boundary', () => {
  it.each([
    ['?lx=en', 'en'],
    ['?lx=ja', 'ja'],
    ['?lx=EN', 'en'],
    ['?lx=', 'ja'],
    ['?lx=invalid', 'ja'],
    ['?lx=en&lx=ja', 'ja'],
    ['?lx=en&lx=invalid', 'ja'],
    ['?lx[]=en', 'ja'],
    ['', 'ja'],
  ])('resolves %s to %s', (search, expected) => {
    expect(resolveDisplayLocale(new URL(`https://jp.umaxica.app/${search}`))).toBe(expected);
  });
});
