import * as fc from 'fast-check';
import { DeviceQuality } from '../DeviceQuality';

describe('DeviceQuality', () => {
  describe('Unit Tests', () => {
    it('detects device tier', () => {
      const quality = new DeviceQuality();
      const tier = quality.getTier();
      expect(['low', 'mid', 'high']).toContain(tier);
    });

    it('provides quality config for low tier', () => {
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 2,
        configurable: true,
      });

      const quality = new DeviceQuality();
      const config = quality.getConfig();
      expect(config.maxParticles).toBe(800);
      expect(config.maxMorphTargets).toBe(4);
      expect(config.thinFilmEnabled).toBe(false);
      expect(config.postProcessIntensity).toBe(0.5);
      expect(config.shaderLOD).toBe('low');
    });

    it('provides quality config for mid tier', () => {
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 6,
        configurable: true,
      });

      const quality = new DeviceQuality();
      const config = quality.getConfig();
      expect(config.maxParticles).toBe(2500);
      expect(config.maxMorphTargets).toBe(8);
      expect(config.thinFilmEnabled).toBe(false);
      expect(config.postProcessIntensity).toBe(0.75);
      expect(config.shaderLOD).toBe('mid');
    });

    it('provides quality config for high tier', () => {
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 16,
        configurable: true,
      });

      const quality = new DeviceQuality();
      const config = quality.getConfig();
      expect(config.maxParticles).toBe(5000);
      expect(config.maxMorphTargets).toBe(12);
      expect(config.thinFilmEnabled).toBe(true);
      expect(config.postProcessIntensity).toBe(1.0);
      expect(config.shaderLOD).toBe('high');
    });

    it('downgrades tier when FPS drops below 30', () => {
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 16,
        configurable: true,
      });

      const quality = new DeviceQuality();
      expect(quality.getTier()).toBe('high');

      // Simulate low FPS for 2 seconds (120 frames at 60fps target)
      for (let i = 0; i < 121; i++) {
        quality.monitorPerformance(25); // Below 30 FPS
      }

      // Should downgrade to mid
      expect(quality.getTier()).toBe('mid');
    });
  });

  describe('Property-Based Tests', () => {
    // P7: Device Quality Tier Bounds
    it('quality config values are always within bounds', () => {
      fc.assert(
        fc.property(fc.constantFrom('low', 'mid', 'high'), (tier) => {
          if (tier === 'low') {
            Object.defineProperty(navigator, 'deviceMemory', { value: 2, configurable: true });
          } else if (tier === 'mid') {
            Object.defineProperty(navigator, 'deviceMemory', { value: 6, configurable: true });
          } else {
            Object.defineProperty(navigator, 'deviceMemory', { value: 16, configurable: true });
          }

          const quality = new DeviceQuality();
          const config = quality.getConfig();

          // maxParticles <= 5000
          expect(config.maxParticles).toBeLessThanOrEqual(5000);
          expect(config.maxParticles).toBeGreaterThan(0);

          // maxMorphTargets <= 12
          expect(config.maxMorphTargets).toBeLessThanOrEqual(12);
          expect(config.maxMorphTargets).toBeGreaterThan(0);

          // postProcessIntensity <= 1.0
          expect(config.postProcessIntensity).toBeLessThanOrEqual(1.0);
          expect(config.postProcessIntensity).toBeGreaterThan(0);

          // shaderLOD is valid
          expect(['low', 'mid', 'high']).toContain(config.shaderLOD);
        }),
      );
    });

    it('low tier values are strictly less than mid tier', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: 2, configurable: true });
      const lowQuality = new DeviceQuality();
      const lowConfig = lowQuality.getConfig();

      Object.defineProperty(navigator, 'deviceMemory', { value: 6, configurable: true });
      const midQuality = new DeviceQuality();
      const midConfig = midQuality.getConfig();

      expect(lowConfig.maxParticles).toBeLessThan(midConfig.maxParticles);
      expect(lowConfig.maxMorphTargets).toBeLessThan(midConfig.maxMorphTargets);
      expect(lowConfig.postProcessIntensity).toBeLessThan(midConfig.postProcessIntensity);
    });

    it('mid tier values are strictly less than high tier', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: 6, configurable: true });
      const midQuality = new DeviceQuality();
      const midConfig = midQuality.getConfig();

      Object.defineProperty(navigator, 'deviceMemory', { value: 16, configurable: true });
      const highQuality = new DeviceQuality();
      const highConfig = highQuality.getConfig();

      expect(midConfig.maxParticles).toBeLessThan(highConfig.maxParticles);
      expect(midConfig.maxMorphTargets).toBeLessThan(highConfig.maxMorphTargets);
      expect(midConfig.postProcessIntensity).toBeLessThan(highConfig.postProcessIntensity);
    });
  });
});
