import { render } from '@testing-library/react';
import { createElement } from '../app/core/node_modules/react';
import { describe, expect, it, vi } from 'vitest';
import appLoader from '../app/core/src/image-loader';
import comLoader from '../com/core/src/image-loader';
import orgLoader from '../org/core/src/image-loader';
import {
  getJitWorkspaceEnvName as getAppEnvName,
  getJitWorkspaceUrl as getAppUrl,
} from '../app/core/src/lib/jit-url';
import {
  getJitWorkspaceEnvName as getComEnvName,
  getJitWorkspaceUrl as getComUrl,
} from '../com/core/src/lib/jit-url';
import {
  getJitWorkspaceEnvName as getOrgEnvName,
  getJitWorkspaceUrl as getOrgUrl,
} from '../org/core/src/lib/jit-url';
import { getCookie } from '../shared/cookie';
import { parseConsentedCookie, shouldShowCookieBanner } from '../shared/consentState';
import { checkRailsHealth } from '../shared/cloudflare/rails-health';
import { getJitWorkspaceUrl as getSharedJitUrl } from '../shared/web/jit-url';
import { ServiceWorkerRegistration as AppServiceWorkerRegistration } from '../app/core/src/components/service-worker-registration';
import { ServiceWorkerRegistration as ComServiceWorkerRegistration } from '../com/core/src/components/service-worker-registration';
import { ServiceWorkerRegistration as OrgServiceWorkerRegistration } from '../org/core/src/components/service-worker-registration';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: 'replay' })),
}));

import * as appInstrumentation from '../app/core/src/instrumentation';
import * as comInstrumentation from '../com/core/src/instrumentation';
import * as devInstrumentation from '../dev/acme/src/instrumentation';
import * as orgInstrumentation from '../org/core/src/instrumentation';

describe('coverage boundaries', () => {
  it.each([
    ['app', appLoader],
    ['com', comLoader],
    ['org', orgLoader],
  ])('%s image loader includes width and optional quality', (_name, loader) => {
    expect(loader({ src: 'https://images.example/photo.jpg', width: 640 })).toBe(
      '/api/image?url=https%3A%2F%2Fimages.example%2Fphoto.jpg&w=640',
    );
    expect(loader({ src: '/photo.jpg', width: 320, quality: 75 })).toBe(
      '/api/image?url=%2Fphoto.jpg&w=320&q=75',
    );
  });

  it.each([
    ['app', getAppEnvName, getAppUrl],
    ['com', getComEnvName, getComUrl],
    ['org', getOrgEnvName, getOrgUrl],
  ])('%s JIT URL helpers handle trimming and missing values', (_name, envName, url) => {
    expect(envName('APP', 'CORE')).toBe('JIT_APP_CORE_URL');
    expect(url('APP', 'CORE', { JIT_APP_CORE_URL: '  https://jit.example/  ' })).toBe(
      'https://jit.example',
    );
    expect(url('APP', 'CORE', { JIT_APP_CORE_URL: '   ' })).toBeNull();
    expect(url('APP', 'CORE', {})).toBeNull();
  });

  it('handles empty and encoded cookie values', () => {
    expect(getCookie('session', '')).toBeNull();
    expect(getCookie('display name', 'display%20name=Jane%20Doe')).toBe('Jane Doe');
    expect(getCookie('missing', 'session=abc')).toBeNull();
  });

  it('maps every consent state', () => {
    expect(parseConsentedCookie('true')).toBe('accepted');
    expect(parseConsentedCookie('1')).toBe('accepted');
    expect(parseConsentedCookie('false')).toBe('denied');
    expect(parseConsentedCookie('0')).toBe('denied');
    expect(parseConsentedCookie(null)).toBe('unknown');
    expect(shouldShowCookieBanner('accepted')).toBe(false);
    expect(shouldShowCookieBanner('denied')).toBe(true);
  });

  it('reads the shared JIT URL from process environment by default', () => {
    vi.stubEnv('JIT_APP_CORE_URL', 'https://shared-jit.example/');
    expect(getSharedJitUrl('APP', 'CORE')).toBe('https://shared-jit.example');
    vi.unstubAllEnvs();
  });

  it('maps Rails health client results', async () => {
    expect(await checkRailsHealth(null)).toEqual({ kind: 'not-configured' });
    expect(await checkRailsHealth({ fetch: vi.fn().mockResolvedValue({ kind: 'ok', status: 200 }) })).toEqual(
      { kind: 'ok', status: 200 },
    );
    expect(await checkRailsHealth({ fetch: vi.fn().mockResolvedValue({ kind: 'http-error', status: 503 }) })).toEqual(
      { kind: 'http-error', status: 503 },
    );
    expect(
      await checkRailsHealth({
        fetch: vi.fn().mockResolvedValue({ kind: 'unreachable', errorMessage: 'down' }),
      }),
    ).toEqual({ kind: 'unreachable', errorMessage: 'down' });
    expect(
      await checkRailsHealth({
        fetch: vi.fn().mockResolvedValue({ kind: 'invalid-path', reason: 'bad path' }),
      }),
    ).toEqual({ kind: 'unreachable', errorMessage: 'bad path' });
  });

  it.each([
    ['app', AppServiceWorkerRegistration],
    ['com', ComServiceWorkerRegistration],
    ['org', OrgServiceWorkerRegistration],
  ])('%s service worker registration handles supported browsers', async (_name, Component) => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });

    expect(render(createElement(Component)).container.innerHTML).toBe('');
    await vi.waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    }));
  });

  it('does not fail when service workers are unavailable or registration rejects', async () => {
    delete (navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
    expect(render(createElement(AppServiceWorkerRegistration)).container.innerHTML).toBe('');

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: vi.fn().mockRejectedValue(new Error('unsupported')) },
    });
    expect(render(createElement(AppServiceWorkerRegistration)).container.innerHTML).toBe('');
  });

  it.each([
    ['app', AppServiceWorkerRegistration],
    ['com', ComServiceWorkerRegistration],
    ['org', OrgServiceWorkerRegistration],
  ])('%s service worker registration tolerates unavailable workers and failures', (_name, Component) => {
    delete (navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
    expect(render(createElement(Component)).container.innerHTML).toBe('');

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: vi.fn().mockRejectedValue(new Error('unsupported')) },
    });
    expect(render(createElement(Component)).container.innerHTML).toBe('');
  });

  it.each([
    ['app', appInstrumentation],
    ['com', comInstrumentation],
    ['dev', devInstrumentation],
    ['org', orgInstrumentation],
  ])('%s instrumentation captures request errors and registers safely', async (_name, module) => {
    expect(() => module.onRequestError(new Error('request failed'))).not.toThrow();

    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    await expect(module.register()).resolves.toBeUndefined();
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    await expect(module.register()).resolves.toBeUndefined();
    vi.stubEnv('NEXT_RUNTIME', 'other');
    await expect(module.register()).resolves.toBeUndefined();
    vi.unstubAllEnvs();
  });
});
