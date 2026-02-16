import { describe, expect, it } from 'vitest';
import { calculateAccuracy, calculateGrade } from './grading';

describe('Grading System', () => {
  describe('calculateAccuracy', () => {
    it('should return 0 when no counters or misses', () => {
      expect(calculateAccuracy(0, 0)).toBe(0);
    });

    it('should return 100 for perfect accuracy', () => {
      expect(calculateAccuracy(50, 0)).toBe(100);
    });

    it('should calculate correct percentage', () => {
      expect(calculateAccuracy(80, 20)).toBe(80);
    });

    it('should round to nearest integer', () => {
      expect(calculateAccuracy(2, 1)).toBe(67); // 66.67 rounds to 67
    });
  });

  describe('calculateGrade', () => {
    it('should give S grade for win with high accuracy and combo', () => {
      const grade = calculateGrade(true, 0.95, 20);
      expect(grade.grade).toBe('S');
    });

    it('should give A grade for win with good accuracy', () => {
      const grade = calculateGrade(true, 0.8, 10);
      expect(grade.grade).toBe('A');
    });

    it('should give lower grades for losses', () => {
      const grade = calculateGrade(false, 0.5, 5);
      expect(['C', 'D']).toContain(grade.grade);
    });

    it('should include a className for CSS styling', () => {
      const grade = calculateGrade(true, 0.9, 15);
      expect(grade.className).toBeTruthy();
      expect(typeof grade.className).toBe('string');
    });

    it('should give D grade for poor performance', () => {
      const grade = calculateGrade(false, 0.1, 1);
      expect(grade.grade).toBe('D');
    });
  });
});
