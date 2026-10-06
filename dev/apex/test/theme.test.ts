// @vitest-environment node
//
// happy-dom implements `Headers` to the browser's rules, which forbid setting
// `cookie` — the header is silently dropped, so every request below would look
// like a visitor with no cookie and the three-way split would be untestable.
// The Workers runtime delivers it, and so does node's `Headers`.
import { describe, expect, it } from 'vitest';

import { requestThemeAttribute, resolveThemeAttribute, themeAttributeMarkup } from '../src/theme';

/*
 * The theme's own logic. What the resulting attribute does to a document is a
 * response, so it is asserted over real HTTP in `api/theme.hurl`; what is left
 * here is the decision itself.
 */
describe('resolveThemeAttribute', () => {
  it('honours the two values that force a scheme', () => {
    expect(resolveThemeAttribute('light')).toBe('light');
    expect(resolveThemeAttribute('dark')).toBe('dark');
  });

  // Everything else is the same answer — no attribute — so the OS decides.
  // `system` is in this list on purpose: it is the name of the state, not a
  // value the cookie ever has to carry.
  it.each([undefined, '', 'system', 'sys', 'DARK', 'blue'])(
    'omits the attribute for %o',
    (value) => {
      expect(resolveThemeAttribute(value)).toBeUndefined();
    },
  );
});

describe('themeAttributeMarkup', () => {
  it('emits nothing when no scheme is forced', () => {
    expect(themeAttributeMarkup(undefined)).toBe('');
  });

  it('emits an attribute with a leading space, ready to follow `lang`', () => {
    expect(themeAttributeMarkup('dark')).toBe(' data-theme="dark"');
    expect(themeAttributeMarkup('light')).toBe(' data-theme="light"');
  });
});

describe('requestThemeAttribute', () => {
  const themeFor = (cookie?: string) =>
    requestThemeAttribute(
      new Request('https://example.test/', cookie ? { headers: { cookie } } : undefined),
    );

  it('reads the forced scheme from the theme cookie', () => {
    expect(themeFor('theme=dark')).toBe('dark');
    expect(themeFor('theme=light')).toBe('light');
  });

  it('ignores an unrecognised value and a missing cookie alike', () => {
    expect(themeFor('theme=sys')).toBeUndefined();
    expect(themeFor()).toBeUndefined();
  });

  // A `language` cookie may sit next to it in the same header, on either side.
  it('finds the cookie among others', () => {
    expect(themeFor('language=ja; theme=dark')).toBe('dark');
    expect(themeFor('theme=dark; language=ja')).toBe('dark');
  });

  // A cookie whose NAME merely ends in `theme` is a different cookie. Without
  // the `(?:^|;)` anchor `color-theme=dark` would set the scheme.
  it('does not match a cookie whose name ends in the same word', () => {
    expect(themeFor('color-theme=dark')).toBeUndefined();
  });
});
