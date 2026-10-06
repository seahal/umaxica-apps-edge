import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const unitRoot = resolve(import.meta.dirname, '..');

describe('apex preference and offline boundaries', () => {
  it.each([
    'public/manifest.webmanifest',
    'public/service-worker-register.js',
    'public/service-worker.js',
  ])('does not ship %s after offline removal', (path) => {
    expect(existsSync(resolve(unitRoot, path))).toBe(false);
  });

  it('does not reference the removed browser surfaces from the renderer', () => {
    const renderer = readFileSync(resolve(unitRoot, 'src/renderer.tsx'), 'utf8');
    expect(renderer).not.toContain('manifest.webmanifest');
    expect(renderer).not.toContain('service-worker-register.js');
  });
});
