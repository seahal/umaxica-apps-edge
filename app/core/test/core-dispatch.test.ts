// @vitest-environment node
//
// See `worker.test.ts` for why: happy-dom's Fetch classes drop forbidden
// headers (e.g. Cookie) at construction time, unlike Node's (undici) or
// workerd's.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { blockedCoreResponse, classifyCorePath, dispatchToRails } from '../src/lib/core-dispatch';

const FRAME = 'app/core';
const ORIGIN = 'https://jp.umaxica.app';
const RAILS = 'https://rails.example';

/** `dispatchToRails` logs on every path; keep the reporter clean. */
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function railsReturns(response: Response) {
  return vi.fn().mockResolvedValue(response);
}

// The dispatcher calls the runtime's global `fetch`; stubbing it is the driver.
async function dispatch(request: Request, fetch: unknown) {
  vi.stubGlobal('fetch', fetch);
  return dispatchToRails(request, { RAILS_ORIGIN: RAILS }, true);
}

describe(`${FRAME} classifyCorePath`, () => {
  /*
   * The ownership table, including the paths Rails also serves and Edge
   * deliberately keeps. Those rows are the point of this table, not an
   * oversight — see the comment block in `core-dispatch.ts` and ADR 009.
   */
  it.each([
    // Rails-owned, prefix matched.
    ['/api/v0/session', 'rails'],
    ['/api/v0', 'rails'],
    ['/api/v0/health.json', 'next'],
    ['/api/v0/revision.json', 'next'],
    ['/web/v0/thing', 'rails'],
    ['/edge/v0/widgets', 'rails'],
    ['/oidc/callback', 'rails'],
    ['/oidc', 'rails'],
    // Rails-owned, exact matched. Logout is listed in both spellings; anything
    // else under /sign/ is not Rails' and must not become Rails' by prefix.
    ['/sign/out', 'rails'],
    ['/sign/out/', 'rails'],
    ['/sign/out/complete', 'rails'],
    ['/sign/out/complete/', 'rails'],
    ['/sign/outside', 'next'],
    ['/sign/out/other', 'next'],
    ['/sign/out/complete/extra', 'next'],
    ['/sign/out//', 'next'],
    ['/sign/in', 'next'],
    // The canonical URIs keep their single spelling: no trailing-slash alias.
    ['/.well-known/jwks.json/', 'next'],
    ['/csp-violation-report/', 'next'],
    ['/.well-known/jwks.json', 'rails'],
    ['/csp-violation-report', 'rails'],
    // Intentional Edge overrides of paths Rails also serves.
    ['/health', 'next'],
    ['/health/startups', 'next'],
    ['/health/livenesses', 'next'],
    ['/health/readinesses', 'next'],
    ['/health/liveness.json', 'blocked'],
    ['/health/readiness.json', 'blocked'],
    ['/health/startup.json', 'blocked'],
    ['/health/anything', 'blocked'],
    ['/robots.txt', 'next'],
    ['/sitemap.xml', 'next'],
    ['/configuration', 'next'],
    // Default, and a near-miss that must not be swept into a Rails prefix.
    ['/', 'next'],
    ['/rails-health', 'next'],
    ['/apiv0-lookalike', 'next'],
  ])('classifies %s as %s', (pathname, expected) => {
    expect(classifyCorePath(pathname)).toBe(expected);
  });

  it('keeps the exact /health path away from the /health/ block', () => {
    // The asymmetry that makes the unified health entry point possible: BLOCKED
    // is a raw `startsWith('/health/')`, so `/health` itself reaches Next.
    expect(classifyCorePath('/health')).toBe('next');
    expect(classifyCorePath('/health/startups')).toBe('next');
    expect(classifyCorePath('/health/livenesses')).toBe('next');
    expect(classifyCorePath('/health/readinesses')).toBe('next');
    expect(classifyCorePath('/health/')).toBe('blocked');
    expect(classifyCorePath('/health/liveness.json')).toBe('blocked');
  });
});

describe(`${FRAME} blockedCoreResponse`, () => {
  it('returns a bodyless 404 that is neither cached nor indexed', async () => {
    const response = blockedCoreResponse();
    expect(response.status).toBe(404);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');
    await expect(response.text()).resolves.toBe('');
  });
});

describe(`${FRAME} dispatchToRails request construction`, () => {
  it('builds the Rails request against RAILS_ORIGIN, not the public hostname', async () => {
    const fetch = railsReturns(new Response('ok'));
    await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch);

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).origin).toBe(RAILS);
  });

  it('does not add an X-Forwarded-Host header', async () => {
    const fetch = railsReturns(new Response('ok'));
    await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch);

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('x-forwarded-host')).toBeNull();
  });

  it('preserves the path and query exactly', async () => {
    const fetch = railsReturns(new Response('ok'));
    await dispatch(new Request(`${ORIGIN}/edge/v0/widgets?limit=10&cursor=abc`), fetch);

    const request = fetch.mock.calls[0]?.[0] as Request;
    const url = new URL(request.url);
    expect(url.pathname).toBe('/edge/v0/widgets');
    expect(url.search).toBe('?limit=10&cursor=abc');
  });

  it('canonicalizes a hostile pile of client identity headers to one validated address', async () => {
    // The adversarial case: every alias a proxy or a Rails middleware might
    // honour, all present, all disagreeing. Exactly one of them is Cloudflare's.
    const fetch = railsReturns(new Response('ok'));
    const incoming = new Request(`${ORIGIN}/api/v0/x`, {
      headers: {
        'cf-connecting-ip': '203.0.113.10',
        'cf-connecting-ipv6': '2001:db8::bad',
        'cf-pseudo-ipv4': '192.0.2.1',
        'client-ip': '13.14.15.16',
        forwarded: 'for=1.2.3.4;host=evil.example;proto=http',
        'true-client-ip': '9.10.11.12',
        'x-client-ip': '17.18.19.20',
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
      },
    });

    await dispatch(incoming, fetch);

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('x-forwarded-for')).toBe('203.0.113.10');
    for (const spoofed of [
      'cf-connecting-ip',
      'cf-connecting-ipv6',
      'cf-pseudo-ipv4',
      'client-ip',
      'forwarded',
      'true-client-ip',
      'x-client-ip',
      'x-real-ip',
    ]) {
      expect(request.headers.get(spoofed), `${spoofed} reached Rails`).toBeNull();
    }
  });

  it.each([
    ['IPv4', '203.0.113.10', '203.0.113.10'],
    ['IPv6', '2001:db8::1', '2001:db8::1'],
    ['an IPv4-mapped IPv6', '::ffff:203.0.113.10', '::ffff:203.0.113.10'],
    ['a malformed address', '203.0.113.999', null],
    ['a comma separated list', '203.0.113.10, 198.51.100.7', null],
    ['an empty value', '', null],
    ['an arbitrary string', 'unknown', null],
  ])('forwards %s as %s', async (_label, header, expected) => {
    const fetch = railsReturns(new Response('ok'));
    await dispatch(
      new Request(`${ORIGIN}/api/v0/x`, { headers: { 'cf-connecting-ip': header } }),
      fetch,
    );

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('x-forwarded-for')).toBe(expected);
  });

  it('asserts no client identity when CF-Connecting-IP is absent, and invents none', async () => {
    // The existing ingress contract tolerates a missing CF-Connecting-IP — the
    // rate limiter buckets it per path rather than rejecting it — so this is not
    // a rejection. It is a refusal to CLAIM an identity: Rails gets no proxy
    // header at all and falls back to the peer address, rather than being handed
    // a guessed one it cannot distinguish from a real one.
    const fetch = railsReturns(new Response('ok'));
    await dispatch(
      new Request(`${ORIGIN}/api/v0/x`, { headers: { 'x-forwarded-for': '1.2.3.4' } }),
      fetch,
    );

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('x-forwarded-for')).toBeNull();
    expect(request.headers.get('x-real-ip')).toBeNull();
  });

  it('replaces rather than appends to an inbound X-Forwarded-For chain', async () => {
    const fetch = railsReturns(new Response('ok'));
    await dispatch(
      new Request(`${ORIGIN}/api/v0/x`, {
        headers: {
          'cf-connecting-ip': '203.0.113.10',
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        },
      }),
      fetch,
    );

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('x-forwarded-for')).toBe('203.0.113.10');
  });

  it('removes attacker-controlled proxy identity headers while preserving application headers', async () => {
    const fetch = railsReturns(new Response('ok'));
    const incoming = new Request(`${ORIGIN}/api/v0/x`, {
      headers: {
        authorization: 'Bearer token',
        cookie: 'session=abc',
        forwarded: 'for=203.0.113.10;host=evil.example;proto=http',
        origin: ORIGIN,
        referer: `${ORIGIN}/sign/in`,
        'x-csrf-token': 'csrf-token',
        'x-forwarded-for': '203.0.113.10',
        'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'http',
        'x-real-ip': '203.0.113.10',
      },
    });

    await dispatch(incoming, fetch);

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('forwarded')).toBeNull();
    expect(request.headers.get('x-forwarded-for')).toBeNull();
    expect(request.headers.get('x-forwarded-host')).toBeNull();
    expect(request.headers.get('x-forwarded-proto')).toBeNull();
    expect(request.headers.get('x-real-ip')).toBeNull();
    // The browser's own credentials are forwarded on purpose — the opposite of
    // what `rails-client.ts` does, and the reason the two exist separately.
    expect(request.headers.get('authorization')).toBe('Bearer token');
    expect(request.headers.get('cookie')).toBe('session=abc');
    expect(request.headers.get('origin')).toBe(ORIGIN);
    expect(request.headers.get('referer')).toBe(`${ORIGIN}/sign/in`);
    expect(request.headers.get('x-csrf-token')).toBe('csrf-token');
  });

  it('carries an abort signal so a stalled upstream cannot hang the request', async () => {
    const fetch = railsReturns(new Response('ok'));
    await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch);

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(request.signal.aborted).toBe(false);
  });

  it('omits duplex for a bodyless GET request', async () => {
    const fetch = railsReturns(new Response('ok'));
    await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('forwards a non-GET body as a stream rather than buffering it', async () => {
    const fetch = railsReturns(new Response('{"id":1}', { status: 201 }));
    const incoming = new Request(`${ORIGIN}/api/v0/things`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'session=abc' },
      body: JSON.stringify({ name: 'thing' }),
    });

    const response = await dispatch(incoming, fetch);

    const request = fetch.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe('POST');
    expect(request.body).not.toBeNull();
    expect(request.headers.get('cookie')).toBe('session=abc');
    // Readable at the far end, which is what "not buffered here" has to mean.
    await expect(request.json()).resolves.toEqual({ name: 'thing' });
    expect(response.status).toBe(201);
  });
});

describe(`${FRAME} dispatchToRails body ceiling`, () => {
  const MAX = 8 * 1024 * 1024;

  const post = (headers: Record<string, string>, body: BodyInit | null) =>
    new Request(`${ORIGIN}/api/v0/things`, {
      method: 'POST',
      headers,
      body,
      duplex: 'half',
    } as RequestInit);

  /** `size` bytes in 64 KiB chunks — never allocated whole, on either side. */
  const chunked = (size: number) => {
    const chunk = new Uint8Array(65_536);
    let sent = 0;
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= size) {
          controller.close();
          return;
        }
        const next = Math.min(chunk.byteLength, size - sent);
        sent += next;
        controller.enqueue(chunk.subarray(0, next));
      },
    });
  };

  it('answers 413 for a declared Content-Length over 8 MiB, without calling Rails', async () => {
    const fetch = vi.fn();
    const response = await dispatch(post({ 'content-length': String(MAX + 1) }, 'x'), fetch);

    expect(response.status).toBe(413);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    await expect(response.text()).resolves.toBe('Payload Too Large\n');
    // The point of reading the declared length first: nothing was uploaded and
    // no Rails invocation was spent.
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([String(MAX - 1), String(MAX)])(
    'dispatches a declared Content-Length of %s to Rails',
    async (length) => {
      const fetch = railsReturns(new Response('ok'));
      const response = await dispatch(post({ 'content-length': length }, 'x'), fetch);

      expect(response.status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ['a negative value', '-1'],
    ['a non-numeric value', 'eight'],
    ['a float', '1024.5'],
  ])('answers 400 for %s rather than proxying it unrestricted', async (_label, length) => {
    const fetch = vi.fn();
    const response = await dispatch(post({ 'content-length': length }, 'x'), fetch);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Bad Request\n');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('answers 413 for an undeclared streaming body that crosses the ceiling', async () => {
    // Rails is reached — the relay is streamed, so the ceiling is only known
    // once the bytes flow — but it can never complete the request: the body it
    // is reading is errored, and Edge answers 413 regardless of its reply.
    const fetch = vi.fn().mockImplementation(async (railsRequest: Request) => {
      await expect(railsRequest.arrayBuffer()).rejects.toBeInstanceOf(Error);
      return new Response('rails never saw a whole request', { status: 200 });
    });

    const response = await dispatch(post({}, chunked(MAX + 65_536)), fetch);

    expect(response.status).toBe(413);
    await expect(response.text()).resolves.toBe('Payload Too Large\n');
  });

  it('answers 413 when a body lies about its declared length', async () => {
    const fetch = vi.fn().mockImplementation(async (railsRequest: Request) => {
      await expect(railsRequest.arrayBuffer()).rejects.toBeInstanceOf(Error);
      return new Response('partial', { status: 201 });
    });

    const response = await dispatch(post({ 'content-length': '10' }, chunked(MAX + 65_536)), fetch);

    expect(response.status).toBe(413);
  });

  it('refuses an oversized body even when RAILS_ORIGIN is not configured', async () => {
    // The ceiling must not be conditional on deployment state: an unconfigured
    // tier answering 503 here would mean "8 MiB" holds only where Rails is wired.
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    const response = await dispatchToRails(
      post({ 'content-length': String(MAX + 1) }, 'x'),
      {},
      true,
    );

    expect(response.status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('relays a body at exactly the ceiling in full', async () => {
    const fetch = vi.fn().mockImplementation(async (railsRequest: Request) => {
      const received = await railsRequest.arrayBuffer();
      return new Response(String(received.byteLength), { status: 200 });
    });

    const response = await dispatch(post({}, chunked(MAX)), fetch);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(String(MAX));
  });
});

describe(`${FRAME} dispatchToRails passthrough`, () => {
  it.each([200, 201, 302, 404, 405, 422, 500])(
    'returns a Rails %i response unchanged',
    async (status) => {
      const railsHeaders = new Headers({ 'content-type': 'application/json' });
      railsHeaders.append('set-cookie', 'session=xyz; Path=/; HttpOnly');
      const fetch = railsReturns(
        new Response(status === 302 ? null : '{"from":"rails"}', {
          status,
          headers: railsHeaders,
        }),
      );

      const response = await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch);

      expect(response.status).toBe(status);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('set-cookie')).toBe('session=xyz; Path=/; HttpOnly');
      if (status !== 302) {
        await expect(response.text()).resolves.toBe('{"from":"rails"}');
      }
    },
  );

  it('passes a plain Rails 500 through, without claiming it as a transport failure', async () => {
    const fetch = railsReturns(
      new Response('Rails 500 page', { status: 500, headers: { 'content-type': 'text/html' } }),
    );

    const response = await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch);

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe('Rails 500 page');
  });

  it('passes a text/plain 500 through whatever its body says', async () => {
    // With no Workers VPC in the path, nothing answers on Rails' behalf: every
    // response that arrives is Rails' own and goes to the browser untouched.
    const fetch = railsReturns(
      new Response('ProxyError: connection_refused', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    const response = await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch);

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe('ProxyError: connection_refused');
  });
});

describe(`${FRAME} dispatchToRails upstream failure`, () => {
  const expectFailClosed = async (response: Response, status = 503) => {
    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    // This is Edge's own document, not Rails', so it carries Edge's headers.
    // A body with no declared type is one the browser may sniff, and this one is
    // served from the application's origin.
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  };

  it.each([
    ['absent', {}],
    ['plain http to a public host', { RAILS_ORIGIN: 'http://rails.example' }],
    ['not a URL', { RAILS_ORIGIN: 'rails.example' }],
  ])('returns 503 when RAILS_ORIGIN is %s, and never calls fetch', async (_label, env) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    const response = await dispatchToRails(new Request(`${ORIGIN}/api/v0/x`), env, true);

    await expectFailClosed(response);
    await expect(response.text()).resolves.toBe('Rails transport not configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 503 when fetch rejects', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.7:3000'));

    const response = await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch);

    await expectFailClosed(response);
    await expect(response.text()).resolves.toBe('Rails upstream unavailable');
  });

  it('returns 504 when the request times out', async () => {
    const timeout = Object.assign(new Error('The operation was aborted due to timeout'), {
      name: 'TimeoutError',
    });
    const fetch = vi.fn().mockRejectedValue(timeout);

    await expectFailClosed(await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch), 504);
  });

  it('returns 504 when the request is aborted', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetch = vi.fn().mockRejectedValue(abort);

    await expectFailClosed(await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch), 504);
  });

  it('returns 503 for a non-Error rejection', async () => {
    const fetch = vi.fn().mockRejectedValue('a string, not an Error');
    await expectFailClosed(await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch));
  });

  it('never retries after a rejection', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('boom'));
    await dispatch(
      new Request(`${ORIGIN}/api/v0/things`, { method: 'POST', body: '{"a":1}' }),
      fetch,
    );
    // A retried POST is a second mutation, not a second chance.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the transport error out of the 503 body', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED 10.0.0.7:3000'));

    const response = await dispatch(new Request(`${ORIGIN}/api/v0/x`), fetch);
    const body = await response.text();

    expect(body).not.toContain('ECONNREFUSED');
    expect(body).not.toContain('10.0.0.7');
    expect(body).not.toContain('rails.example');
  });
});
