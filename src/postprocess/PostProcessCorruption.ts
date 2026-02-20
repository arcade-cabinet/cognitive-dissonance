import type { Camera } from '@babylonjs/core/Cameras/camera';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector2 } from '@babylonjs/core/Maths/math.vector';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import type { Scene } from '@babylonjs/core/scene';

/**
 * PostProcessCorruption — Tension-driven post-processing pipeline (Grok spec)
 *
 * DefaultRenderingPipeline for bloom/vignette/chromatic aberration, plus:
 * - `worldCrushDistortion` custom PostProcess: radial distortion from boss impact point
 * - `ambientCorruption` custom PostProcess: full-screen subtle corruption overlay
 *
 * Bloom: weight = tension x 0.8, kernel = 32 + tension x 32
 * Vignette: weight = tension x 0.6, color matches tension color (blue->red)
 * Chromatic aberration: amount = tension x 0.04
 *
 * Respects DeviceQuality tier settings for effect intensity caps.
 */
export class PostProcessCorruption {
  private static instance: PostProcessCorruption | null = null;

  private pipeline: DefaultRenderingPipeline | null = null;
  private scene: Scene | null = null;
  private camera: Camera | null = null;
  private currentTension: number = 0.0;
  private deviceQualityIntensity: number = 1.0; // 0.5 (low) | 0.75 (mid) | 1.0 (high)

  // Custom post-process effects
  private worldCrushEffect: PostProcess | null = null;
  private ambientCorruptionEffect: PostProcess | null = null;
  private worldCrushActive: boolean = false;
  private worldCrushImpactPoint: Vector2 = new Vector2(0.5, 0.5);
  private worldCrushStrength: number = 0.0;

  // Vignette color ramp endpoints
  private readonly calmVignetteColor = new Color4(0.1, 0.2, 0.8, 0.0); // blue
  private readonly warmVignetteColor = new Color4(0.8, 0.7, 0.1, 0.0); // yellow
  private readonly criticalVignetteColor = new Color4(0.9, 0.15, 0.1, 0.0); // red

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
    this.pipeline.bloomScale = 0.5;
    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.chromaticAberrationEnabled = true;

    // Create custom post-process effects
    this.createWorldCrushEffect(scene, camera);
    this.createAmbientCorruptionEffect(scene, camera);

    // Set initial weights (tension = 0.0)
    this.updateEffects(0.0);

    console.log(`[PostProcessCorruption] Initialized with device quality intensity: ${this.deviceQualityIntensity}`);
  }

  /**
   * Create worldCrushDistortion PostProcess
   * Radial distortion from boss impact point, activated during boss slam phases
   */
  private createWorldCrushEffect(scene: Scene, camera: Camera): void {
    this.worldCrushEffect = new PostProcess(
      'worldCrush',
      'worldCrushDistortion',
      ['impactPoint', 'distortionStrength', 'time'],
      null,
      1.0,
      camera,
    );

    this.worldCrushEffect.onApply = (effect) => {
      effect.setFloat2('impactPoint', this.worldCrushImpactPoint.x, this.worldCrushImpactPoint.y);
      effect.setFloat('distortionStrength', this.worldCrushActive ? this.worldCrushStrength : 0.0);
      effect.setFloat('time', performance.now() / 1000.0);
    };

    // Start disabled
    this.worldCrushEffect.onActivate = null;
  }

  /**
   * Create ambientCorruption PostProcess
   * Always-on full-screen corruption overlay that scales with tension
   */
  private createAmbientCorruptionEffect(scene: Scene, camera: Camera): void {
    this.ambientCorruptionEffect = new PostProcess(
      'ambientCorruption',
      'ambientCorruption',
      ['tension', 'time', 'intensity'],
      null,
      1.0,
      camera,
    );

    this.ambientCorruptionEffect.onApply = (effect) => {
      effect.setFloat('tension', this.currentTension);
      effect.setFloat('time', performance.now() / 1000.0);
      effect.setFloat('intensity', this.deviceQualityIntensity);
    };
  }

  /**
   * Activate world crush distortion (boss slam phase)
   * @param impactPoint - 3D world position of boss slam impact
   */
  activateWorldCrush(impactPoint: Vector3): void {
    this.worldCrushActive = true;
    // Project 3D impact to screen UV (simplified: normalized XZ -> 0..1)
    this.worldCrushImpactPoint = new Vector2(
      (impactPoint.x + 1.0) * 0.5,
      (impactPoint.z + 1.0) * 0.5,
    );
    this.worldCrushStrength = 1.0;
  }

  /**
   * Deactivate world crush distortion
   */
  deactivateWorldCrush(): void {
    this.worldCrushActive = false;
    this.worldCrushStrength = 0.0;
  }

  /**
   * Check if world crush is currently active
   */
  isWorldCrushActive(): boolean {
    return this.worldCrushActive;
  }

  /**
   * Get current world crush strength
   */
  getWorldCrushStrength(): number {
    return this.worldCrushStrength;
  }

  /**
   * Get the world crush impact point (screen UV)
   */
  getWorldCrushImpactPoint(): Vector2 {
    return this.worldCrushImpactPoint;
  }

  /**
   * Update effect weights based on current tension
   * Called by TensionSystem listener or per-frame update
   * @param tension - Current tension value (0.0-0.999)
   */
  setTension(tension: number): void {
    this.currentTension = tension;
    this.updateEffects(tension);
  }

  /**
   * Get current tension
   */
  getTension(): number {
    return this.currentTension;
  }

  /**
   * Update all post-process effect weights (Grok spec values)
   * @param tension - Current tension value (0.0-0.999)
   */
  private updateEffects(tension: number): void {
    if (!this.pipeline) return;

    // Apply device quality intensity cap
    const intensity = this.deviceQualityIntensity;

    // Bloom: weight = tension x 0.8, kernel = 32 + tension x 32
    if (this.pipeline.bloomEnabled) {
      this.pipeline.bloomWeight = tension * 0.8 * intensity;
      this.pipeline.bloomKernel = 32 + Math.floor(tension * 32); // 32-64
    }

    // Vignette: weight = tension x 0.6, color matches tension color (blue->red)
    if (this.pipeline.imageProcessing) {
      this.pipeline.imageProcessing.vignetteWeight = tension * 0.6 * intensity;
      this.pipeline.imageProcessing.vignetteEnabled = tension > 0.01;

      // 3-stop color ramp for vignette: blue -> yellow -> red
      this.pipeline.imageProcessing.vignetteColor = this.getVignetteColor(tension);
    }

    // Chromatic aberration: amount = tension x 0.04
    if (this.pipeline.chromaticAberration) {
      this.pipeline.chromaticAberration.aberrationAmount = tension * 0.04 * intensity;
    }
  }

  /**
   * Compute 3-stop vignette color ramp: blue -> yellow -> red
   */
  private getVignetteColor(tension: number): Color4 {
    if (tension < 0.45) {
      const t = tension / 0.45;
      return Color4.Lerp(this.calmVignetteColor, this.warmVignetteColor, t);
    }
    const t = (tension - 0.45) / 0.55;
    return Color4.Lerp(this.warmVignetteColor, this.criticalVignetteColor, t);
  }

  /**
   * Reset for new Dream
   */
  reset(): void {
    this.currentTension = 0.0;
    this.updateEffects(0.0);
    this.deactivateWorldCrush();
    console.log('[PostProcessCorruption] Reset');
  }

  /**
   * Dispose the pipeline and custom effects
   */
  dispose(): void {
    if (this.worldCrushEffect) {
      this.worldCrushEffect.dispose();
      this.worldCrushEffect = null;
    }
    if (this.ambientCorruptionEffect) {
      this.ambientCorruptionEffect.dispose();
      this.ambientCorruptionEffect = null;
    }
    if (this.pipeline) {
      this.pipeline.dispose();
      this.pipeline = null;
    }
    this.scene = null;
    this.camera = null;
    console.log('[PostProcessCorruption] Disposed');
  }
}
