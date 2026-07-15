describe('dev/apex/api/index.ts', () => {
  it('exports runtime as edge', async () => {
    const mod = await import('../api/index');
    expect(mod.runtime).toBe('edge');
  });

  it('exports GET handler', async () => {
    const mod = await import('../api/index');
    expect(mod.GET).toBeTypeOf('function');
  });
});
