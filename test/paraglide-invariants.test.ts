import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '..');
const frames = [
  ...['app', 'com', 'org'].flatMap((audience) =>
    ['core', 'docs', 'help', 'info', 'news'].map((surface) => `${audience}/${surface}`),
  ),
];

const read = (relativePath: string): string => readFileSync(join(repoRoot, relativePath), 'utf8');

describe('Paraglide frame contract', () => {
  it('configures every TanStack unit with the pinned compiler and no persistence strategy', () => {
    for (const frame of frames) {
      const manifest = JSON.parse(read(`${frame}/package.json`)) as {
        devDependencies?: Record<string, string>;
      };
      expect(manifest.devDependencies?.['@inlang/paraglide-js'], frame).toBe('catalog:');
      expect(manifest.devDependencies?.['@inlang/plugin-message-format'], frame).toBe('catalog:');
      expect(manifest.devDependencies?.['@inlang/plugin-m-function-matcher'], frame).toBe(
        'catalog:',
      );

      const settingsPath = `${frame}/project.inlang/settings.json`;
      expect(existsSync(join(repoRoot, settingsPath)), settingsPath).toBe(true);
      const settings = JSON.parse(read(settingsPath)) as {
        baseLocale?: string;
        locales?: string[];
        modules?: string[];
      };
      expect(settings.baseLocale, frame).toBe('ja');
      expect(settings.locales, frame).toEqual(['ja', 'en']);
      expect(settings.modules, frame).toEqual([
        './node_modules/@inlang/plugin-message-format/dist/index.js',
        './node_modules/@inlang/plugin-m-function-matcher/dist/index.js',
      ]);

      const vite = read(`${frame}/vite.config.ts`);
      expect(vite, frame).toContain('paraglideVitePlugin');
      expect(vite, frame).toContain("strategy: ['custom-edge-locale', 'baseLocale']");
      expect(vite, frame).not.toContain("strategy: ['cookie'");
      expect(vite, frame).not.toContain('preferredLanguage');
    }
  });
});
