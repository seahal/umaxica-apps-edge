import { describe, it, expect } from 'vite-plus/test';

describe('dev/apex/api/index.ts', () => {
  it('exports runtime as edge', async () => {
    const mod = await import('../api/index');
    expect(mod.runtime).toBe('edge');
  });

  it('exports default handler', async () => {
    const mod = await import('../api/index');
    expect(mod.default).toBeDefined();
  });
});
