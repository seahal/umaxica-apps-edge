export {};

const hydrateCalls: unknown[][] = [];
const originalDocument = globalThis.document as Document | undefined;
const originalWindow = globalThis.window as (Window & typeof globalThis) | undefined;

if (!originalDocument) {
  (globalThis as { document?: Document }).document = {
    nodeType: 9,
  } as unknown as Document;
}

if (!originalWindow) {
  (globalThis as { window?: Window & typeof globalThis }).window = {
    ENV: {},
  } as unknown as Window & typeof globalThis;
}

vi.mock('react-dom/client', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    hydrateRoot: (...args: unknown[]) => {
      hydrateCalls.push(args);
    },
  };
});

vi.mock('react-router/dom', async (importOriginal) => {
  const actual = await (importOriginal as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    HydratedRouter: () => null,
  };
});

await import('../src/entry.client');

it('hydrates the app client entry without throwing', () => {
  expect(hydrateCalls.length).toBe(1);
  expect(hydrateCalls[0]?.[0]).toBe(document);
});

afterAll(() => {
  vi.restoreAllMocks();

  if (originalDocument) {
    globalThis.document = originalDocument;
  } else {
    delete (globalThis as { document?: Document }).document;
  }

  if (originalWindow) {
    globalThis.window = originalWindow;
  } else {
    delete (globalThis as { window?: Window & typeof globalThis }).window;
  }
});
