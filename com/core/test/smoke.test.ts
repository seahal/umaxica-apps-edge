describe('smoke', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2);
  });

  it('multiplies numbers', () => {
    expect(2 * 3).toBe(6);
  });

  it('checks string equality', () => {
    expect('hello').toBe('hello');
  });

  it('checks array length', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
  });
});
