import { addDays, daysBetween, formatDate, isFutureDate, isPastDate } from '../../src/utils/date';

describe('Date Utilities', () => {
  describe(formatDate, () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2024-03-05');
      expect(formatDate(date)).toBe('2024-03-05');
    });
  });

  describe(isPastDate, () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(isPastDate(pastDate)).toBeTruthy();
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(isPastDate(futureDate)).toBeFalsy();
    });
  });

  describe(isFutureDate, () => {
    it('should return true for future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(isFutureDate(futureDate)).toBeTruthy();
    });

    it('should return false for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(isFutureDate(pastDate)).toBeFalsy();
    });
  });

  describe(daysBetween, () => {
    it('should calculate days between two dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-10');
      expect(daysBetween(date1, date2)).toBe(9);
    });

    it('should work regardless of order', () => {
      const date1 = new Date('2024-01-10');
      const date2 = new Date('2024-01-01');
      expect(daysBetween(date1, date2)).toBe(9);
    });

    it('should return 0 for same dates', () => {
      const date = new Date('2024-01-01');
      expect(daysBetween(date, date)).toBe(0);
    });
  });

  describe(addDays, () => {
    it('should add days to a date', () => {
      const date = new Date('2024-01-01');
      const result = addDays(date, 5);
      expect(formatDate(result)).toBe('2024-01-06');
    });

    it('should subtract days with negative number', () => {
      const date = new Date('2024-01-10');
      const result = addDays(date, -5);
      expect(formatDate(result)).toBe('2024-01-05');
    });

    it('should not modify original date', () => {
      const date = new Date('2024-01-01');
      const original = formatDate(date);
      addDays(date, 5);
      expect(formatDate(date)).toBe(original);
    });
  });
});
