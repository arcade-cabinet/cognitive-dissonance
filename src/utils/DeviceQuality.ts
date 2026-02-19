/**
 * DeviceQuality — Adaptive quality system
 * Detects device tier (low/mid/high) and applies quality config
 * Requirement 3: Adaptive Device Quality
 */

import type { Scene } from '@babylonjs/core/scene';

export type DeviceTier = 'low' | 'mid' | 'high';

export interface QualityConfig {
  maxParticles: number;
  maxMorphTargets: number;
  thinFilmEnabled: boolean;
  postProcessIntensity: number;
  shaderLOD: 'low' | 'mid' | 'high';
}

const QUALITY_CONFIGS: Record<DeviceTier, QualityConfig> = {
  low: {
    maxParticles: 800,
    maxMorphTargets: 4,
    thinFilmEnabled: false,
    postProcessIntensity: 0.5,
    shaderLOD: 'low',
  },
  mid: {
    maxParticles: 2500,
    maxMorphTargets: 8,
    thinFilmEnabled: false,
    postProcessIntensity: 0.75,
    shaderLOD: 'mid',
  },
  high: {
    maxParticles: 5000,
    maxMorphTargets: 12,
    thinFilmEnabled: true,
    postProcessIntensity: 1.0,
    shaderLOD: 'high',
  },
};

export class DeviceQuality {
  private tier: DeviceTier;
  private config: QualityConfig;
  private lowFpsFrames = 0;

  constructor() {
    this.tier = this.detectTier();
    this.config = QUALITY_CONFIGS[this.tier];
  }

  /**
   * Detect device tier from available device memory and user agent heuristics
   * Requirement 3.1
   */
  private detectTier(): DeviceTier {
    // Web: use navigator.deviceMemory if available
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      // biome-ignore lint/suspicious/noExplicitAny: deviceMemory is not in standard Navigator type
      const memory = (navigator as any).deviceMemory as number;
      if (memory >= 8) return 'high';
      if (memory >= 4) return 'mid';
      return 'low';
    }

    // Fallback: UA heuristics
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      // High-end indicators
      if (ua.includes('iphone') && (ua.includes('iphone14') || ua.includes('iphone15') || ua.includes('iphone16'))) {
        return 'high';
      }
      if (ua.includes('snapdragon 8')) return 'high';
      // Mid-range indicators
      if (ua.includes('iphone12') || ua.includes('iphone13')) return 'mid';
      if (ua.includes('snapdragon 7')) return 'mid';
    }

    // Default to mid tier
    return 'mid';
  }

  /**
   * Apply quality config to scene
   * Requirement 3.2
   */
  applyToScene(scene: Scene): void {
    // Store config on scene metadata for systems to read
    scene.metadata = scene.metadata || {};
    scene.metadata.qualityConfig = this.config;
    scene.metadata.deviceTier = this.tier;
  }

  /**
   * Monitor FPS and downgrade tier if performance drops
   * Requirement 3.5 (target 45 FPS minimum)
   * Requirement 40.3 (downgrade tier if < 30 FPS for 2s)
   */
  monitorPerformance(fps: number, scene?: Scene): void {
    if (fps < 30) {
      this.lowFpsFrames++;
      if (this.lowFpsFrames > 120) {
        // 2 seconds at 60fps target
        this.downgradeTier();
        this.lowFpsFrames = 0;
        // Re-apply config to scene if provided
        if (scene) {
          this.applyToScene(scene);
        }
      }
    } else {
      this.lowFpsFrames = 0;
    }
  }

  private downgradeTier(): void {
    if (this.tier === 'high') {
      this.tier = 'mid';
      this.config = QUALITY_CONFIGS.mid;
      console.warn('[DeviceQuality] Downgraded to mid tier due to low FPS');
    } else if (this.tier === 'mid') {
      this.tier = 'low';
      this.config = QUALITY_CONFIGS.low;
      console.warn('[DeviceQuality] Downgraded to low tier due to low FPS');
    }
  }

  getTier(): DeviceTier {
    return this.tier;
  }

  getConfig(): QualityConfig {
    return this.config;
  }
}
