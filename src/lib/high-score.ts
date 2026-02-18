/**
 * High score persistence via localStorage.
 * SSR-safe — returns defaults when window is unavailable.
 */

export const STORAGE_KEY = 'cognitive-dissonance-highscore';

export interface HighScoreData {
  peakCoherence: number;
  levelsSurvived: number;
  seed: string;
}

const DEFAULT_HIGH_SCORE: HighScoreData = {
  peakCoherence: 0,
  levelsSurvived: 0,
  seed: '',
};

function clampNonNegativeInt(val: unknown, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) return fallback;
  return Math.floor(val);
}

export function loadHighScore(): HighScoreData {
  if (typeof window === 'undefined') return DEFAULT_HIGH_SCORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HIGH_SCORE;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_HIGH_SCORE;
    return {
      peakCoherence: clampNonNegativeInt(parsed.peakCoherence, 0),
      levelsSurvived: clampNonNegativeInt(parsed.levelsSurvived, 0),
      seed: typeof parsed.seed === 'string' ? parsed.seed : '',
    };
  } catch (err) {
    console.error('[HighScore] Failed to load:', err);
    return DEFAULT_HIGH_SCORE;
  }
}

export function saveHighScore(data: HighScoreData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('[HighScore] Failed to save:', err);
  }
}
