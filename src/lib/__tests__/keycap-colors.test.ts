import { describe, expect, it } from 'vitest';
import { getKeycapColor, KEYCAP_COLORS, KEYCAP_COUNT } from '../keycap-colors';

describe('keycap-colors', () => {
  it('KEYCAP_COLORS has 12 entries', () => {
    expect(KEYCAP_COLORS.length).toBe(12);
    expect(KEYCAP_COUNT).toBe(12);
  });

  it('all hues are in 0-360 range', () => {
    for (const kc of KEYCAP_COLORS) {
      expect(kc.hue).toBeGreaterThanOrEqual(0);
      expect(kc.hue).toBeLessThan(360);
    }
  });

  it('each hue is unique (evenly spaced)', () => {
    const hues = KEYCAP_COLORS.map((kc) => kc.hue);
    const unique = new Set(hues);
    expect(unique.size).toBe(12);

    // Check spacing is ~30 degrees
    for (let i = 1; i < hues.length; i++) {
      expect(hues[i] - hues[i - 1]).toBeCloseTo(30, 0);
    }
  });

  it('Color3 values have r, g, b in 0-1 range', () => {
    for (const kc of KEYCAP_COLORS) {
      expect(kc.color3.r).toBeGreaterThanOrEqual(0);
      expect(kc.color3.r).toBeLessThanOrEqual(1);
      expect(kc.color3.g).toBeGreaterThanOrEqual(0);
      expect(kc.color3.g).toBeLessThanOrEqual(1);
      expect(kc.color3.b).toBeGreaterThanOrEqual(0);
      expect(kc.color3.b).toBeLessThanOrEqual(1);
    }
  });

  it('getKeycapColor(0) matches KEYCAP_COLORS[0]', () => {
    const computed = getKeycapColor(0);
    expect(computed.hue).toBe(KEYCAP_COLORS[0].hue);
    expect(computed.color3.r).toBeCloseTo(KEYCAP_COLORS[0].color3.r, 5);
    expect(computed.color3.g).toBeCloseTo(KEYCAP_COLORS[0].color3.g, 5);
    expect(computed.color3.b).toBeCloseTo(KEYCAP_COLORS[0].color3.b, 5);
  });

  it('Color4 has matching rgb with alpha 1', () => {
    for (const kc of KEYCAP_COLORS) {
      expect(kc.color4.r).toBeCloseTo(kc.color3.r, 5);
      expect(kc.color4.g).toBeCloseTo(kc.color3.g, 5);
      expect(kc.color4.b).toBeCloseTo(kc.color3.b, 5);
      expect(kc.color4.a).toBe(1.0);
    }
  });
});
