// @vitest-environment node

import { readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const srcDirPath = fileURLToPath(new URL('../src', import.meta.url));
const skipFileNames = new Set(['entry.client.tsx', 'entry.server.tsx']);
const allowedExtensions = new Set(['.ts', '.tsx']);

function collectModules(currentDir: string): string[] {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('+')) {
        continue;
      }
      files.push(...collectModules(fullPath));
      continue;
    }

    const extension = extname(entry.name);
    if (!allowedExtensions.has(extension)) {
      continue;
    }

    if (entry.name.endsWith('.d.ts')) {
      continue;
    }

    if (skipFileNames.has(entry.name)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

const moduleFilePaths = [...collectModules(srcDirPath)].sort((a, b) => a.localeCompare(b));

describe('com src module imports', () => {
  it('found executable source files to import', () => {
    expect(moduleFilePaths.length).toBeGreaterThan(0);
  });

  for (const modulePath of moduleFilePaths) {
    const displayPath = relative(srcDirPath, modulePath);

    it(`imports ${displayPath}`, async () => {
      const moduleExports = await import(pathToFileURL(modulePath).href);
      expect(moduleExports).toBeDefined();
    });
  }
});
