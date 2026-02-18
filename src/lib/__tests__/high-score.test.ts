import { beforeEach, describe, expect, it } from 'vitest';
import { loadHighScore, STORAGE_KEY, saveHighScore } from '../high-score';

describe('high-score', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when no score saved', () => {
    const hs = loadHighScore();
    expect(hs.peakCoherence).toBe(0);
    expect(hs.levelsSurvived).toBe(0);
    expect(hs.seed).toBe('');
  });

  it('saves and loads a score', () => {
    saveHighScore({ peakCoherence: 85, levelsSurvived: 4, seed: 'abc123' });
    const hs = loadHighScore();
    expect(hs.peakCoherence).toBe(85);
    expect(hs.levelsSurvived).toBe(4);
    expect(hs.seed).toBe('abc123');
  });

  it('overwrites previous score', () => {
    saveHighScore({ peakCoherence: 50, levelsSurvived: 2, seed: 'first' });
    saveHighScore({ peakCoherence: 90, levelsSurvived: 6, seed: 'second' });
    const hs = loadHighScore();
    expect(hs.peakCoherence).toBe(90);
    expect(hs.seed).toBe('second');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const hs = loadHighScore();
    expect(hs.peakCoherence).toBe(0);
  });

  it('handles partial data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ peakCoherence: 42 }));
    const hs = loadHighScore();
    expect(hs.peakCoherence).toBe(42);
    expect(hs.levelsSurvived).toBe(0);
    expect(hs.seed).toBe('');
  });

  it('rejects negative and NaN values', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ peakCoherence: -5, levelsSurvived: NaN }));
    const hs = loadHighScore();
    expect(hs.peakCoherence).toBe(0);
    expect(hs.levelsSurvived).toBe(0);
  });

  it('rejects string values for numeric fields', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ peakCoherence: 'high', levelsSurvived: '3' }));
    const hs = loadHighScore();
    expect(hs.peakCoherence).toBe(0);
    expect(hs.levelsSurvived).toBe(0);
  });
});
