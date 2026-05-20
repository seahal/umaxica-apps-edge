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

const findByPath = (path: string) => manifest.find((entry) => entry.path === path);
const findByFile = (file: string) => manifest.find((entry) => entry.file === file);

describe('com route manifest', () => {
  it('exposes the health route', () => {
    expect(findByPath('health')).toMatchObject({
      file: 'routes/health.tsx',
      path: 'health',
    });
  });

  it('wraps primary routes with the decorated layout', () => {
    const decorated = routes[1];
    expect(decorated).toMatchObject({ file: '../src/layouts/decorated.tsx' });
    expect(decorated?.children ?? []).toStrictEqual([
      expect.objectContaining({ file: 'routes/_index.tsx', index: true }),
    ]);
  });

  it('includes the application index route', () => {
    expect(findByFile('routes/_index.tsx')).toMatchObject({
      file: 'routes/_index.tsx',
      index: true,
    });
  });

  it('exposes the explore index route', () => {
    expect(findByPath('explore')).toMatchObject({
      file: 'routes/explore/_index.tsx',
      index: true,
      path: 'explore',
    });
  });
});
