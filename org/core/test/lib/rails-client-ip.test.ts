// @vitest-environment node
//
// The Edge client-IP trust boundary, asserted on the pure functions.
// `test/core-dispatch.test.ts` asserts the same contract end to end on the
// request that actually reaches Rails.
import { describe, expect, it } from 'vitest';

import {
  CLIENT_IP_AUTHORITY_HEADER,
  UNTRUSTED_CLIENT_IP_HEADERS,
  canonicalizeClientIdentity,
  parseClientIp,
} from '../../src/lib/client-ip';

describe('parseClientIp equivalence classes', () => {
  it.each([
    ['203.0.113.10', '203.0.113.10'],
    ['0.0.0.0', '0.0.0.0'],
    ['255.255.255.255', '255.255.255.255'],
    ['  203.0.113.10  ', '203.0.113.10'],
  ])('accepts the IPv4 address %s', (value, expected) => {
    expect(parseClientIp(value)).toBe(expected);
  });

  it.each([
    ['2001:db8::1', '2001:db8::1'],
    ['::1', '::1'],
    ['::', '::'],
    ['2001:0db8:85a3:0000:0000:8a2e:0370:7334', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'],
    ['::ffff:203.0.113.10', '::ffff:203.0.113.10'],
  ])('accepts the IPv6 address %s', (value, expected) => {
    expect(parseClientIp(value)).toBe(expected);
  });

  it.each([
    ['header absent', null],
    ['empty string', ''],
    ['whitespace only', '   '],
    ['NUL', '\u0000'],
    ['an embedded NUL', '203.0.113.10\u0000'],
    ['a comma separated list', '203.0.113.10, 198.51.100.7'],
    ['a space separated pair', '203.0.113.10 198.51.100.7'],
    ['a malformed IPv4', '203.0.113.999'],
    ['a truncated IPv4', '203.0.113'],
    ['an over-long IPv4', '203.0.113.10.7'],
    ['a leading-zero IPv4', '203.0.113.010'],
    ['a negative octet', '203.0.113.-1'],
    ['an IPv4 with a port', '203.0.113.10:443'],
    ['a bracketed IPv6', '[2001:db8::1]'],
    ['an IPv6 with a zone id', 'fe80::1%eth0'],
    ['a double compressed IPv6', '2001::db8::1'],
    ['a hostname', 'localhost'],
    ['a header injection attempt', '203.0.113.10\r\nX-Real-IP: 1.2.3.4'],
    ['a tab separated pair', '203.0.113.10\t198.51.100.7'],
    ['an arbitrary string', 'unknown'],
  ])('rejects %s', (_label, value) => {
    expect(parseClientIp(value)).toBeNull();
  });

  it('rejects undefined the same way it rejects an absent header', () => {
    expect(parseClientIp(undefined)).toBeNull();
  });
});

describe('canonicalizeClientIdentity', () => {
  const hostile = () =>
    new Headers({
      'cf-connecting-ip': '203.0.113.10',
      'cf-connecting-ipv6': '2001:db8::bad',
      'cf-pseudo-ipv4': '192.0.2.1',
      'client-ip': '13.14.15.16',
      forwarded: 'for=1.2.3.4;host=evil.example;proto=http',
      'true-client-ip': '9.10.11.12',
      'x-client-ip': '17.18.19.20',
      'x-forwarded-for': '1.2.3.4',
      'x-forwarded-host': 'evil.example',
      'x-forwarded-proto': 'http',
      'x-real-ip': '5.6.7.8',
    });

  it('names CF-Connecting-IP as the one authority', () => {
    expect(CLIENT_IP_AUTHORITY_HEADER).toBe('cf-connecting-ip');
  });

  it('replaces every client identity header with one validated X-Forwarded-For', () => {
    const headers = hostile();
    canonicalizeClientIdentity(headers, '203.0.113.10');

    expect(headers.get('x-forwarded-for')).toBe('203.0.113.10');
    for (const name of UNTRUSTED_CLIENT_IP_HEADERS) {
      if (name === 'x-forwarded-for') continue;
      expect(headers.get(name), `${name} crossed the trust boundary`).toBeNull();
    }
  });

  it('never appends to an inbound X-Forwarded-For', () => {
    const headers = hostile();
    canonicalizeClientIdentity(headers, '203.0.113.10');
    expect(headers.get('x-forwarded-for')).not.toContain('1.2.3.4');
    expect(headers.get('x-forwarded-for')?.includes(',')).toBe(false);
  });

  it('asserts no client identity at all when there is no validated address', () => {
    const headers = hostile();
    canonicalizeClientIdentity(headers, null);

    // Fail closed: Rails sees no proxy header and falls back to the peer
    // address. Edge never invents one, and never lets the caller's survive.
    expect(headers.get('x-forwarded-for')).toBeNull();
    for (const name of UNTRUSTED_CLIENT_IP_HEADERS) {
      expect(headers.get(name), `${name} crossed the trust boundary`).toBeNull();
    }
  });

  it('leaves application headers alone', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4',
      cookie: 'session=abc',
      'x-csrf-token': 'csrf',
      'content-type': 'application/json',
    });
    canonicalizeClientIdentity(headers, '203.0.113.10');

    expect(headers.get('cookie')).toBe('session=abc');
    expect(headers.get('x-csrf-token')).toBe('csrf');
    expect(headers.get('content-type')).toBe('application/json');
  });
});
