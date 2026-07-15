import { render } from '@testing-library/react';
// @ts-expect-error React is provided by the app workspace, not the root package.
import { createElement } from '../app/core/node_modules/react';
import { describe, expect, it, vi } from 'vitest';
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

function removeServiceWorker() {
  delete (navigator as unknown as { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
}

describe('coverage boundaries', () => {
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
    await vi.waitFor(() =>
      expect(register).toHaveBeenCalledWith('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }),
    );
  });

  it('does not fail when service workers are unavailable or registration rejects', async () => {
    removeServiceWorker();
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
  ])(
    '%s service worker registration tolerates unavailable workers and failures',
    (_name, Component) => {
      removeServiceWorker();
      expect(render(createElement(Component)).container.innerHTML).toBe('');

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { register: vi.fn().mockRejectedValue(new Error('unsupported')) },
      });
      expect(render(createElement(Component)).container.innerHTML).toBe('');
    },
  );

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
