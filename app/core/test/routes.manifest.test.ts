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

describe('route manifest', () => {
  it('exposes the health route', () => {
    expect(findByPath('health')).toMatchObject({
      file: 'routes/health.tsx',
      path: 'health',
    });
  });

  it('includes the application index route', () => {
    expect(findByFile('routes/_index.tsx')).toMatchObject({
      file: 'routes/_index.tsx',
      index: true,
    });
  });

  it('registers the decorated layout shell', () => {
    expect(findByFile('../src/layouts/decorated.tsx')).toBeDefined();
  });

  it.each([
    ['configuration', 'routes/configurations/_index.tsx'],
    ['message', 'routes/messages/_index.tsx'],
    ['notification', 'routes/notifications/_index.tsx'],
    ['explore', 'routes/explore/_index.tsx'],
    ['authentication', 'routes/authentication/_index.tsx'],
  ])('exposes the %s index route', (path, file) => {
    expect(findByPath(path)).toMatchObject({ file, path });
  });

  it('includes the configuration child routes', () => {
    expect(findByPath('configuration')).toMatchObject({
      file: 'routes/configurations/_index.tsx',
      index: true,
      path: 'configuration',
    });
    expect(findByPath('configuration/account')).toMatchObject({
      file: 'routes/configurations/account.tsx',
      path: 'configuration/account',
    });
    expect(findByPath('configuration/preference')).toMatchObject({
      file: 'routes/configurations/preference.tsx',
      path: 'configuration/preference',
    });
  });
});
