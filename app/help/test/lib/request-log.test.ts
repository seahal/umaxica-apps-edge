// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  classifyEdgeRoute,
  createRequestId,
  getRequestId,
  logEdgeRequest,
  normalizeEdgeEnvironment,
  normalizeEdgeMethod,
  outcomeForStatus,
  runWithRequestId,
  withRequestId,
  withRequestIdRequest,
  type EdgeRequestLogEntry,
} from '../../src/lib/request-log';

let emitted: { channel: 'log' | 'warn' | 'error'; line: string }[] = [];

beforeEach(() => {
  emitted = [];
  vi.spyOn(console, 'log').mockImplementation((line: string) => {
    emitted.push({ channel: 'log', line });
  });
  vi.spyOn(console, 'warn').mockImplementation((line: string) => {
    emitted.push({ channel: 'warn', line });
  });
  vi.spyOn(console, 'error').mockImplementation((line: string) => {
    emitted.push({ channel: 'error', line });
  });
});

afterEach(() => vi.restoreAllMocks());

function onlyLine() {
  expect(emitted).toHaveLength(1);
  const line = emitted[0];
  if (line === undefined) throw new Error('no log line was emitted');
  return { channel: line.channel, json: JSON.parse(line.line) as Record<string, unknown> };
}

describe('request ID boundaries', () => {
  it('scopes the generated ID for internal client setup', () => {
    expect(getRequestId()).toBeUndefined();
    runWithRequestId('request-id-for-test', () => {
      expect(getRequestId()).toBe('request-id-for-test');
    });
    expect(getRequestId()).toBeUndefined();
  });

  it('creates a UUID and overrides an incoming response ID', async () => {
    const requestId = createRequestId();
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/iu);

    const response = withRequestId(
      new Response('body', { status: 201, headers: { 'X-Request-ID': 'external-marker' } }),
      requestId,
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('X-Request-ID')).toBe(requestId);
    await expect(response.text()).resolves.toBe('body');
  });

  it('adds the generated ID to a bodyless request and preserves the body request', async () => {
    const id = 'request-id-for-test';
    const empty = withRequestIdRequest(new Request('http://localhost/'), id);
    expect(empty.headers.get('X-Request-ID')).toBe(id);

    const withBody = withRequestIdRequest(
      new Request('http://localhost/submit', { method: 'POST', body: 'あ' }),
      id,
    );
    expect(withBody.headers.get('X-Request-ID')).toBe(id);
    await expect(withBody.text()).resolves.toBe('あ');
  });
});

describe('normalization and route reduction', () => {
  it.each(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])(
    'keeps method %s',
    (method) => {
      expect(normalizeEdgeMethod(method.toLowerCase())).toBe(method);
    },
  );

  it('folds an unknown method into OTHER', () => {
    expect(normalizeEdgeMethod('TRACE')).toBe('OTHER');
  });

  it.each(['production', 'development', 'test', 'local', 'vpc'])('keeps environment %s', (env) => {
    expect(normalizeEdgeEnvironment(env)).toBe(env);
  });

  it('folds unknown environment values to unknown', () => {
    expect(normalizeEdgeEnvironment(undefined)).toBe('unknown');
    expect(normalizeEdgeEnvironment('preview')).toBe('unknown');
  });

  it.each([
    ['/', 'root'],
    ['/about', 'about'],
    ['/about/', 'about'],
    ['/health', 'health'],
    ['/health/startups', 'health-startup'],
    ['/health/livenesses', 'health-liveness'],
    ['/health/readinesses', 'health-readiness'],
    ['/api/v0/health.json', 'health-api'],
    ['/revision', 'revision'],
    ['/revision/', 'revision'],
    ['/api/v0/revision.json', 'revision-api'],
    ['/.well-known/jwks.json', 'jwks'],
    ['/csp-violation-report', 'csp_report'],
    ['/sign/out', 'sign_out'],
    ['/sign/out/complete', 'sign_out'],
    ['/assets/app.js', 'assets'],
    ['/api/v0/entries', 'api_v0'],
    ['/web/v0/session', 'web_v0'],
    ['/edge/v0/health', 'edge_v0'],
    ['/oidc/callback', 'oidc'],
    ['/ja/entries/one', 'publishing'],
    ['/unknown/identifier?secret=marker', 'other'],
  ] as const)('reduces %s to %s', (path, expected) => {
    expect(classifyEdgeRoute(path)).toBe(expected);
  });
});

describe('outcome and structured line', () => {
  it.each([
    [200, 'completed'],
    [302, 'completed'],
    [404, 'rejected'],
    [429, 'rejected'],
    [500, 'failed'],
    [503, 'failed'],
  ] as const)('maps HTTP %i to %s', (status, expected) => {
    expect(outcomeForStatus(status)).toBe(expected);
  });

  const base: EdgeRequestLogEntry = {
    service: 'public',
    environment: 'test',
    request_id: 'generated-request-id',
    method: 'GET',
    route: 'publishing',
    status: 200,
    duration_ms: 12,
    outcome: 'completed',
  };

  it.each([
    ['completed', 'info', 'log'],
    ['rejected', 'warn', 'warn'],
    ['failed', 'error', 'error'],
    ['timeout', 'error', 'error'],
  ] as const)('emits %s with the %s level on console.%s', (outcome, level, channel) => {
    logEdgeRequest({ ...base, outcome, status: outcome === 'completed' ? 200 : 503 });

    const line = onlyLine();
    expect(line.channel).toBe(channel);
    expect(line.json).toEqual({
      level,
      msg: 'edge_request',
      data: {
        event: 'edge_request',
        service: 'public',
        environment: 'test',
        request_id: 'generated-request-id',
        method: 'GET',
        route: 'publishing',
        status: outcome === 'completed' ? 200 : 503,
        duration_ms: 12,
        outcome,
      },
    });
  });

  it('does not echo secret markers or request paths', () => {
    logEdgeRequest({
      ...base,
      request_id: 'marker-request-id',
      route: 'other',
      outcome: 'failed',
    });
    const output = JSON.stringify(onlyLine().json);
    expect(output).not.toContain('SECRET');
    expect(output).not.toContain('/users/');
  });
});
