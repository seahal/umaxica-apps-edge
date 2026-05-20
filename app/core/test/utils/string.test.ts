import { capitalize, formatNumber, isValidEmail, truncate } from '../../src/utils/string';

describe('String Utilities', () => {
  describe(capitalize, () => {
    it('should capitalize the first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should handle already capitalized strings', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });
  });

  describe(truncate, () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Hi', 5)).toBe('Hi');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(truncate('', 5)).toBe('');
    });
  });

  describe(isValidEmail, () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBeTruthy();
      expect(isValidEmail('user.name@domain.co.jp')).toBeTruthy();
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBeFalsy();
      expect(isValidEmail('@example.com')).toBeFalsy();
      expect(isValidEmail('test@')).toBeFalsy();
      expect(isValidEmail('test @example.com')).toBeFalsy();
    });
  });

  describe(formatNumber, () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1_000_000)).toBe('1,000,000');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(100)).toBe('100');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });
});
