export {};

const routeModule = await import('../../src/routes/_index');
const { meta } = routeModule;

describe('Route: home (app) meta', () => {
  it('declares the home page as indexable', () => {
    expect(meta({ data: { codeName: 'UMAXICA' } } as never)).toStrictEqual([
      { title: 'UMAXICA (app)' },
      { content: 'Umaxica - 今何してる？', name: 'description' },
      { content: 'index, follow', name: 'robots' },
    ]);
  });
});
