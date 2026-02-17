/**
 * Game Grading System
 *
 * Calculates post-game grade based on performance.
 * Restored from the original game's grading criteria.
 *
 * API contract:
 *   - calculateAccuracy() returns a NORMALIZED value in [0, 1]
 *   - calculateGrade() expects accuracy in [0, 1]
 *   - Callers display accuracy as percentage: `Math.round(accuracy * 100) + '%'`
 */

export interface GradeInfo {
  grade: string;
  className: string;
}

/**
 * Calculate letter grade from performance metrics.
 * @param win — whether the player won
 * @param accuracy — normalized accuracy in [0, 1]
 * @param maxCombo — highest combo streak achieved
 */
export function calculateGrade(win: boolean, accuracy: number, maxCombo: number): GradeInfo {
  if (win && accuracy > 0.9 && maxCombo > 8) return { grade: 'S', className: 'grade-s' };
  if (win && accuracy > 0.75) return { grade: 'A', className: 'grade-a' };
  if (win) return { grade: 'B', className: 'grade-b' };
  if (accuracy > 0.5) return { grade: 'C', className: 'grade-c' };
  return { grade: 'D', className: 'grade-d' };
}

/**
 * Calculate accuracy as a normalized value in [0, 1].
 * @returns accuracy between 0 and 1 (NOT 0-100)
 */
export function calculateAccuracy(totalC: number, totalM: number): number {
  return totalC / Math.max(1, totalC + totalM);
}
