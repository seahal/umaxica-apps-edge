// Local helpers mirroring routing checks
export function getDomainType(host: string): string {
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

export function shouldRedirectToJapanese(host: string): boolean {
  return /^umaxica\.(com|org|app)$/.test(host);
}

export function getJapaneseRedirectUrl(_host: string): string {
  return 'https://jp.help.umaxica.app/contacts/new';
}

describe('Domain Routing (app)', () => {
  it('identifies app domain', () => {
    expect(getDomainType('jp.umaxica.app')).toBe('app');
    expect(getDomainType('app.localdomain:4444')).toBe('app');
  });

  it('root app domain redirects to Japanese', () => {
    expect(shouldRedirectToJapanese('umaxica.app')).toBeTruthy();
    expect(shouldRedirectToJapanese('jp.umaxica.app')).toBeFalsy();
    expect(getJapaneseRedirectUrl('umaxica.app')).toBe('https://jp.help.umaxica.app/contacts/new');
  });
});
