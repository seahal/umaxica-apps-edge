export {};

const hydrateCalls: unknown[][] = [];
const originalDocument = globalThis.document as Document | undefined;

if (!originalDocument) {
  (globalThis as { document?: Document }).document = {
    nodeType: 9,
  } as unknown as Document;
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

it('hydrates the com client entry without throwing', () => {
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
});
