import routes from '../src/routes';

interface RouteManifestEntry {
  children?: RouteManifestEntry[];
  file?: string;
  index?: boolean;
  path?: string;
}

const flattenRoutes = (entries: RouteManifestEntry[]): RouteManifestEntry[] => {
  const result: RouteManifestEntry[] = [];
  for (const entry of entries) {
    result.push(entry);
    if (entry.children?.length) {
      result.push(...flattenRoutes(entry.children));
    }
  }
  return result;
};

const manifest = flattenRoutes(routes as RouteManifestEntry[]);

const findByFile = (file: string) => manifest.find((entry) => entry.file === file);

describe('dev route manifest', () => {
  it('wraps the home route with the decorated layout', () => {
    const decorated = routes[0];
    expect(decorated).toMatchObject({ file: '../src/layouts/decorated.tsx' });
    expect(decorated?.children ?? []).toStrictEqual([
      expect.objectContaining({ file: 'routes/home.tsx', index: true }),
      expect.objectContaining({ file: 'routes/about.tsx', path: 'about' }),
      expect.objectContaining({ file: 'routes/health.tsx', path: 'health' }),
      expect.objectContaining({ file: 'routes/catch-all.tsx', path: '*' }),
    ]);
  });

  it('exposes the home index route', () => {
    expect(findByFile('routes/home.tsx')).toMatchObject({
      file: 'routes/home.tsx',
      index: true,
    });
  });

  it('exposes the catch-all route', () => {
    expect(findByFile('routes/catch-all.tsx')).toMatchObject({
      file: 'routes/catch-all.tsx',
      path: '*',
    });
  });

  it('exposes the about route', () => {
    expect(findByFile('routes/about.tsx')).toMatchObject({
      file: 'routes/about.tsx',
      path: 'about',
    });
  });

  it('exposes the health route', () => {
    expect(findByFile('routes/health.tsx')).toMatchObject({
      file: 'routes/health.tsx',
      path: 'health',
    });
  });
});
