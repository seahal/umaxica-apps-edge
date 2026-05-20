/* eslint-disable import/no-named-export, func-style, exports-last, group-exports */
function getDomainType(host: string): string {
  const [cleanHost = ''] = host.split(':');
  if (
    cleanHost === 'umaxica.app' ||
    cleanHost.endsWith('.umaxica.app') ||
    cleanHost === 'app.localdomain' ||
    cleanHost.endsWith('.app.localdomain')
  ) {
    return 'app';
  }
  if (
    cleanHost === 'umaxica.com' ||
    cleanHost.endsWith('.umaxica.com') ||
    cleanHost === 'com.localdomain' ||
    cleanHost.endsWith('.com.localdomain')
  ) {
    return 'com';
  }
  if (
    cleanHost === 'umaxica.org' ||
    cleanHost.endsWith('.umaxica.org') ||
    cleanHost === 'org.localdomain' ||
    cleanHost.endsWith('.org.localdomain')
  ) {
    return 'org';
  }
  return 'world';
}

function shouldRedirectToJapanese(host: string): boolean {
  return /^umaxica\.(com|org|app)$/.test(host);
}

function getJapaneseRedirectUrl(host: string): string {
  return `https://jp.${host}/`;
}

describe('Domain Routing (org)', () => {
  it('identifies org domain', () => {
    expect(getDomainType('jp.umaxica.org')).toBe('org');
    expect(getDomainType('org.localdomain:4444')).toBe('org');
  });

  it('root org domain redirects to Japanese', () => {
    expect(shouldRedirectToJapanese('umaxica.org')).toBeTruthy();
    expect(shouldRedirectToJapanese('jp.umaxica.org')).toBeFalsy();
    expect(getJapaneseRedirectUrl('umaxica.org')).toBe('https://jp.umaxica.org/');
  });
});

export { getDomainType, shouldRedirectToJapanese, getJapaneseRedirectUrl };
