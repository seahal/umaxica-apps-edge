import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { routerState } = vi.hoisted(() => ({ routerState: { matches: [] as unknown[] } }));

vi.mock('@tanstack/react-router', () => ({
  useRouterState: (options: { select: (state: { matches: unknown[] }) => unknown }) =>
    options.select(routerState),
}));

import { RouteAnnouncer } from '../src/components/route-announcer';
import { ServiceWorkerRegistration } from '../src/components/service-worker-registration';
import { ErrorDocument, NotFoundDocument } from '../src/components/status-documents';
import { BRAND_TITLE } from '../src/lib/title';

const roots: Root[] = [];

function mount(node: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(node));
  return {
    container,
    rerender: (next: ReactNode) => act(() => root.render(next)),
  };
}

function removeServiceWorker() {
  delete (navigator as unknown as { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
}

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  routerState.matches = [];
  removeServiceWorker();
  document.body.innerHTML = '';
});

describe('route announcer', () => {
  it('skips titleless matches, uses the deepest last title, and announces the rendered document once', async () => {
    routerState.matches = [undefined, {}, { meta: [] }, { meta: [undefined, { title: '' }] }];
    document.title = 'Initial document';
    const view = mount(<RouteAnnouncer />);

    expect(view.container.querySelector('output')?.textContent).toBe('');
    expect(view.container.querySelector('output')?.getAttribute('aria-live')).toBe('polite');
    expect(view.container.querySelector('output')?.getAttribute('aria-atomic')).toBe('true');

    act(() => roots.pop()?.unmount());
    routerState.matches = [
      { meta: [{ title: 'Parent title' }, { title: 'Parent override' }] },
      { meta: [{ title: 'Child title' }, { title: 'Deepest title' }] },
    ];
    const announced = mount(<RouteAnnouncer />);
    expect(announced.container.querySelector('output')?.textContent).toBe('');

    routerState.matches = [
      { meta: [{ title: 'Changed parent' }] },
      { meta: [{ title: 'Changed child title' }, { title: 'Deepest title' }] },
    ];
    document.title = 'Document title actually rendered';
    announced.rerender(<RouteAnnouncer />);
    expect(announced.container.querySelector('output')?.textContent).toBe('');

    routerState.matches = [
      { meta: [{ title: 'Parent title after child disappears' }] },
      { meta: undefined },
    ];
    document.title = 'Parent document rendered';
    announced.rerender(<RouteAnnouncer />);
    expect(announced.container.querySelector('output')?.textContent).toBe('Parent document rendered');

    routerState.matches = [{ meta: [{ title: '' }] }];
    document.title = 'Document without a route title';
    announced.rerender(<RouteAnnouncer />);
    expect(announced.container.querySelector('output')?.textContent).toBe(
      'Document without a route title',
    );
  });
});

describe('service worker registration', () => {
  it('registers on supported browsers and quietly handles unsupported or rejected registration', async () => {
    removeServiceWorker();
    expect(mount(<ServiceWorkerRegistration />).container.innerHTML).toBe('');

    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    expect(mount(<ServiceWorkerRegistration />).container.innerHTML).toBe('');
    await vi.waitFor(() =>
      expect(register).toHaveBeenCalledWith('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      }),
    );

    const rejectRegistration = vi.fn().mockRejectedValue(new Error('registration denied'));
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: rejectRegistration },
    });
    expect(mount(<ServiceWorkerRegistration />).container.innerHTML).toBe('');
    expect(rejectRegistration).toHaveBeenCalledOnce();
    await act(async () => Promise.resolve());
  });
});

describe('status documents', () => {
  it('renders a 404 document and invokes the error recovery action', () => {
    const notFound = renderToStaticMarkup(<NotFoundDocument />);
    expect(notFound).toContain(`<title>ページが見つかりません — ${BRAND_TITLE}</title>`);
    expect(notFound).toContain('HTTP 404');
    expect(notFound).toContain('noindex, nofollow');

    const reset = vi.fn();
    const { container } = mount(<ErrorDocument error={new Error('route failed')} reset={reset} />);
    container.querySelector('button')?.click();
    expect(reset).toHaveBeenCalledOnce();
  });
});
