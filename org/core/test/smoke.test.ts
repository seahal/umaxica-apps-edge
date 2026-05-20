describe('smoke', () => {
  it('basic truthiness', () => {
    const value = 'ok';
    expect(Boolean(value)).toBeTruthy();
  });
});
