/**
 * Sphere Nebula Material — Cognitive Dissonance v3.0
 *
 * PBRMaterial extension with custom celestial nebula shader.
 * Implements Requirement 9: Sphere Nebula Material
 *
 * Features:
 * - Sub-surface refraction (0.95), zero metallic, near-zero roughness (glass appearance)
 * - Custom GLSL shader (auto-converted to WGSL on WebGPU)
 * - Tension-driven color interpolation: blue (0.1, 0.6, 1.0) → red (1.0, 0.3, 0.1)
 * - Breathing scale pulse: sin(time × 1.8) × tension × 0.03
 * - Static jitter above tension 0.7
 */

import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';

/**
 * SphereNebulaMaterial
 *
 * Extends PBRMaterial with glass properties and custom nebula shader.
 * Listens to TensionSystem for tension changes and updates shader uniforms.
 */
export class SphereNebulaMaterial {
  private glassMaterial: PBRMaterial;
  private nebulaMaterial: ShaderMaterial;
  private sphereMesh: Mesh;
  private scene: Scene;
  private currentTension = 0.0;
  private startTime: number;
  private breathingPulseEnabled = true;

  // Color constants (Req 9.3)
  private readonly calmColor = new Color3(0.1, 0.6, 1.0); // blue
  private readonly violentColor = new Color3(1.0, 0.3, 0.1); // red

  constructor(name: string, scene: Scene, sphereMesh: Mesh) {
    this.scene = scene;
    this.sphereMesh = sphereMesh;
    this.startTime = performance.now();

    // Create glass PBR material (Req 9.1)
    this.glassMaterial = new PBRMaterial(`${name}_glass`, scene);
    this.glassMaterial.metallic = 0.0; // zero metallic
    this.glassMaterial.roughness = 0.05; // near-zero roughness
    this.glassMaterial.alpha = 0.95; // slight transparency
    this.glassMaterial.subSurface.isRefractionEnabled = true;
    this.glassMaterial.subSurface.refractionIntensity = 0.95; // Req 9.1
    this.glassMaterial.subSurface.indexOfRefraction = 1.5; // glass IOR

    // Create nebula shader material (Req 9.2)
    this.nebulaMaterial = new ShaderMaterial(
      `${name}_nebula`,
      scene,
      {
        vertex: 'celestialNebula',
        fragment: 'celestialNebula',
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'worldViewProjection',
          'world',
          'tension',
          'time',
          'corruptionLevel',
          'baseColor',
          'deviceQualityLOD',
          'calmColor',
          'violentColor',
        ],
      },
    );

    // Apply nebula material to sphere (glass material will be applied as overlay in future)
    this.sphereMesh.material = this.nebulaMaterial;

    // Register per-frame update
    this.scene.registerBeforeRender(this.update);
  }

  /**
   * Update shader uniforms per frame
   *
   * Implements:
   * - Req 9.3: Tension-driven color interpolation
   * - Req 9.4: Breathing scale pulse
   * - Req 9.5: Static jitter above tension 0.7
   */
  private update = (): void => {
    const elapsedSeconds = (performance.now() - this.startTime) / 1000;

    // Update time uniform
    this.nebulaMaterial.setFloat('time', elapsedSeconds);

    // Update tension uniform (will be set by TensionSystem listener)
    this.nebulaMaterial.setFloat('tension', this.currentTension);

    // Corruption level (same as tension for now)
    this.nebulaMaterial.setFloat('corruptionLevel', this.currentTension);

    // Device quality LOD (read from scene metadata)
    const qualityTier = this.scene.metadata?.deviceTier || 'mid';
    const lod = qualityTier === 'high' ? 1.0 : qualityTier === 'mid' ? 0.5 : 0.0;
    this.nebulaMaterial.setFloat('deviceQualityLOD', lod);

    // Color uniforms
    this.nebulaMaterial.setColor3('calmColor', this.calmColor);
    this.nebulaMaterial.setColor3('violentColor', this.violentColor);

    // Base color (interpolated between calm and violent)
    const interpolatedColor = Color3.Lerp(this.calmColor, this.violentColor, this.currentTension);
    this.nebulaMaterial.setColor3('baseColor', interpolatedColor);

    // Breathing scale pulse (Req 9.4)
    if (this.breathingPulseEnabled) {
      const pulseFrequency = 1.8; // Hz
      const pulseAmplitude = this.currentTension * 0.03; // max 0.03 at tension 1.0
      const pulse = Math.sin(elapsedSeconds * pulseFrequency * 2 * Math.PI) * pulseAmplitude;
      const scale = 1.0 + pulse;
      this.sphereMesh.scaling = new Vector3(scale, scale, scale);
    }
  };

  /**
   * Set tension value (called by TensionSystem listener)
   *
   * Implements Req 9.3: Tension-driven color interpolation
   */
  setTension(tension: number): void {
    this.currentTension = Math.max(0.0, Math.min(0.999, tension));
  }

  /**
   * Enable/disable breathing pulse animation
   *
   * Implements Req 9.4
   */
  setBreathingPulseEnabled(enabled: boolean): void {
    this.breathingPulseEnabled = enabled;
    if (!enabled) {
      this.sphereMesh.scaling = Vector3.One();
    }
  }

  /**
   * Dispose materials and unregister update loop
   */
  dispose(): void {
    this.scene.unregisterBeforeRender(this.update);
    this.glassMaterial.dispose();
    this.nebulaMaterial.dispose();
  }
}
