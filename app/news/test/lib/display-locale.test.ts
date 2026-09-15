// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { resolveDisplayLocale } from '../../src/lib/display-locale';

const requestFor = (search: string, cookie?: string): Request =>
  new Request(`https://docs-jp.umaxica.app/${search}`, {
    headers: cookie === undefined ? {} : { cookie },
  });

describe('public display locale boundary', () => {
  it.each([
    ['?lx=en', undefined, 'en'],
    ['?lx=EN', undefined, 'en'],
    ['?lx=', 'language=en', 'en'],
    ['?lx=unsupported', 'language=en', 'en'],
    ['?lx=unsupported', undefined, 'ja'],
    ['?lx=en&lx=ja', undefined, 'ja'],
    ['?lx[]=en', 'language=en', 'en'],
    ['', 'language=EN; theme=dark', 'en'],
    ['', 'theme=dark', 'ja'],
  ])('resolves %s with %s to %s', (search, cookie, expected) => {
    expect(resolveDisplayLocale(requestFor(search, cookie))).toBe(expected);
  });

  it('does not treat a similarly named cookie as the Rails language cookie', () => {
    expect(resolveDisplayLocale(requestFor('', 'language_backup=en'))).toBe('ja');
  });
});
