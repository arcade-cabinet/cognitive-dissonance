import type { Camera } from '@babylonjs/core/Cameras/camera';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import type { Scene } from '@babylonjs/core/scene';

/**
 * PostProcessCorruption — Tension-driven post-processing pipeline
 *
 * Applies bloom, vignette, and chromatic aberration that scale with tension:
 * - Bloom weight: tension × 0.8
 * - Vignette weight: tension × 0.6
 * - Chromatic aberration: tension × 0.04
 *
 * Respects DeviceQuality tier settings for effect intensity caps.
 */
export class PostProcessCorruption {
  private static instance: PostProcessCorruption | null = null;

  private pipeline: DefaultRenderingPipeline | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: scene/camera stored for future use (e.g., pipeline recreation)
  private scene: Scene | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: camera stored for future use (e.g., pipeline recreation)
  private camera: Camera | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: currentTension tracked for state management
  private currentTension: number = 0.0;
  private deviceQualityIntensity: number = 1.0; // 0.5 (low) | 0.75 (mid) | 1.0 (high)

  private constructor() {}

  static getInstance(): PostProcessCorruption {
    if (!PostProcessCorruption.instance) {
      PostProcessCorruption.instance = new PostProcessCorruption();
    }
    return PostProcessCorruption.instance;
  }

  /**
   * Initialize the post-process pipeline
   * @param scene - Babylon.js scene
   * @param camera - Active camera to attach effects to
   */
  init(scene: Scene, camera: Camera): void {
    this.scene = scene;
    this.camera = camera;

    // Read device quality intensity from scene metadata (set by DeviceQuality system)
    const qualityConfig = scene.metadata?.qualityConfig;
    if (qualityConfig?.postProcessIntensity !== undefined) {
      this.deviceQualityIntensity = qualityConfig.postProcessIntensity;
    }

    // Create DefaultRenderingPipeline with bloom, vignette, and chromatic aberration
    this.pipeline = new DefaultRenderingPipeline(
      'postProcessCorruption',
      true, // HDR
      scene,
      [camera],
    );

    // Enable effects
    this.pipeline.bloomEnabled = true;
    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.chromaticAberrationEnabled = true;

    // Set initial weights (tension = 0.0)
    this.updateEffects(0.0);

    console.log(`[PostProcessCorruption] Initialized with device quality intensity: ${this.deviceQualityIntensity}`);
  }

  /**
   * Update effect weights based on current tension
   * Called by TensionSystem listener or per-frame update
   * @param tension - Current tension value (0.0–0.999)
   */
  setTension(tension: number): void {
    this.currentTension = tension;
    this.updateEffects(tension);
  }

  /**
   * Update all post-process effect weights
   * @param tension - Current tension value (0.0–0.999)
   */
  private updateEffects(tension: number): void {
    if (!this.pipeline) return;

    // Apply device quality intensity cap
    const intensity = this.deviceQualityIntensity;

    // Bloom weight: tension × 0.8 × intensity
    if (this.pipeline.bloomEnabled) {
      this.pipeline.bloomWeight = tension * 0.8 * intensity;
    }

    // Vignette weight: tension × 0.6 × intensity
    if (this.pipeline.imageProcessing) {
      this.pipeline.imageProcessing.vignetteWeight = tension * 0.6 * intensity;
      this.pipeline.imageProcessing.vignetteEnabled = tension > 0.01; // Enable only when visible
    }

    // Chromatic aberration: tension × 0.04 × intensity
    if (this.pipeline.chromaticAberration) {
      this.pipeline.chromaticAberration.aberrationAmount = tension * 0.04 * intensity;
    }
  }

  /**
   * Reset for new Dream
   */
  reset(): void {
    this.currentTension = 0.0;
    this.updateEffects(0.0);
    console.log('[PostProcessCorruption] Reset');
  }

  /**
   * Dispose the pipeline
   */
  dispose(): void {
    if (this.pipeline) {
      this.pipeline.dispose();
      this.pipeline = null;
    }
    this.scene = null;
    this.camera = null;
    console.log('[PostProcessCorruption] Disposed');
  }
}
