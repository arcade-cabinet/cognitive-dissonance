/**
 * High score persistence via localStorage.
 * SSR-safe — returns defaults when window is unavailable.
 */

const STORAGE_KEY = 'cognitive-dissonance-highscore';

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

export function loadHighScore(): HighScoreData {
  if (typeof window === 'undefined') return DEFAULT_HIGH_SCORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HIGH_SCORE;
    const parsed = JSON.parse(raw);
    return {
      peakCoherence: parsed.peakCoherence ?? 0,
      levelsSurvived: parsed.levelsSurvived ?? 0,
      seed: parsed.seed ?? '',
    };
  } catch {
    return DEFAULT_HIGH_SCORE;
  }
}

export function saveHighScore(data: HighScoreData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
