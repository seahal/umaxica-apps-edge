import { renderToStaticMarkup } from 'react-dom/server';
import { CloudflareContext } from '../../src/context';

vi.mock('../../src/components/EventList', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    EventList: () => <div data-testid="event-list" />,
  };
});

const routeModule = await import('../../src/routes/_index');
const { loader, meta, default: HomeRoute } = routeModule;

afterAll(() => {
  vi.restoreAllMocks();
});

function runLoader(env: Record<string, unknown>) {
  const contextMap = new Map<unknown, unknown>([[CloudflareContext, { cloudflare: { env } }]]);
  return loader({
    context: { get: (key: unknown) => contextMap.get(key) },
  } as never);
}

describe('Route: home (org)', () => {
  it('defines localized metadata', () => {
    const entries = meta({ data: { codeName: 'UMAXICA' } } as never);
    expect(entries).toContainEqual({
      title: 'UMAXICA (org)',
    });
    expect(entries).toContainEqual({
      content: 'コミュニティイベントに参加しましょう',
      name: 'description',
    });
    expect(entries).toContainEqual({
      content: 'index, follow',
      name: 'robots',
    });
  });

  it('injects Cloudflare env values via the loader', () => {
    const result = runLoader({ VALUE_FROM_CLOUDFLARE: 'edge-ready' });
    expect(result).toStrictEqual({ codeName: 'Umaxica', message: 'edge-ready' });
  });

  it('injects brand name via the loader', () => {
    const result = runLoader({ BRAND_NAME: 'UMAXICA' });
    expect(result).toStrictEqual({ codeName: 'UMAXICA', message: undefined });
  });

  it('renders the event list component', () => {
    const markup = renderToStaticMarkup(
      <HomeRoute loaderData={{ codeName: 'Umaxica', message: '' }} />,
    );
    expect(markup).toContain('data-testid="event-list"');
  });
});
