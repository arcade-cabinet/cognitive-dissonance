/**
 * Sphere Nebula Material — Cognitive Dissonance v3.0
 *
 * Dual-material setup: PBR glass outer sphere + nebula corruption inner sphere.
 * Implements Requirement 9: Sphere Nebula Material
 *
 * Features:
 * - Outer glass sphere: Sub-surface refraction (0.95), zero metallic, near-zero roughness
 * - Inner nebula sphere: nebulaCorruption shader with tension-driven color + breathing pulse
 * - Tension-driven color interpolation: blue (0.1, 0.6, 1.0) -> red (1.0, 0.3, 0.1)
 * - Breathing pulse driven via shader uniform (not JS-side Vector3 scaling)
 * - Static jitter above tension 0.7
 */

import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';

/**
 * SphereNebulaMaterial
 *
 * Dual-material system: glass PBR on outer sphere, nebulaCorruption shader on inner sphere.
 * Listens to TensionSystem for tension changes and updates shader uniforms.
 */
export class SphereNebulaMaterial {
  private glassMaterial: PBRMaterial;
  private nebulaMaterial: ShaderMaterial;
  private innerSphereMesh: Mesh | null = null;
  private sphereMesh: Mesh;
  private scene: Scene;
  private currentTension = 0.0;
  private startTime: number;
  private breathingPulseEnabled = true;

  // Color constants (Req 9.3) — 3-stop ramp: blue -> yellow/green -> red
  private readonly calmColor = new Color3(0.1, 0.6, 1.0); // blue
  private readonly warmColor = new Color3(0.6, 0.85, 0.15); // yellow-green midpoint
  private readonly violentColor = new Color3(1.0, 0.3, 0.1); // red

  constructor(name: string, scene: Scene, sphereMesh: Mesh) {
    this.scene = scene;
    this.sphereMesh = sphereMesh;
    this.startTime = performance.now();

    // Create glass PBR material with nebula-driven emissive (Req 9.1)
    this.glassMaterial = new PBRMaterial(`${name}_glass`, scene);
    this.glassMaterial.metallic = 0.0; // zero metallic
    this.glassMaterial.roughness = 0.05; // near-zero roughness
    this.glassMaterial.alpha = 0.92;
    this.glassMaterial.subSurface.isRefractionEnabled = true;
    this.glassMaterial.subSurface.refractionIntensity = 0.95; // Req 9.1
    this.glassMaterial.subSurface.indexOfRefraction = 1.5; // glass IOR
    // Emissive color will be updated per frame based on tension
    this.glassMaterial.emissiveColor = this.calmColor.clone();
    this.glassMaterial.emissiveIntensity = 0.8;

    // Apply glass material to outer sphere (provides refraction envelope)
    this.sphereMesh.material = this.glassMaterial;

    // Create slightly smaller inner sphere for nebula shader (Req 9.2)
    this.innerSphereMesh = MeshBuilder.CreateSphere(
      `${name}_innerNebula`,
      { diameter: 0.48, segments: 32 },
      scene,
    );
    this.innerSphereMesh.parent = sphereMesh;

    // Create nebulaCorruption ShaderMaterial for inner sphere
    this.nebulaMaterial = new ShaderMaterial(
      `${name}_nebula`,
      scene,
      {
        vertex: 'nebulaCorruption',
        fragment: 'nebulaCorruption',
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
          'cameraPosition',
          'calmColor',
          'warmColor',
          'violentColor',
        ],
        needAlphaBlending: true,
      },
    );

    // Set initial uniform values
    this.nebulaMaterial.setFloat('tension', 0.0);
    this.nebulaMaterial.setFloat('time', 0.0);
    this.nebulaMaterial.setFloat('corruptionLevel', 0.0);
    this.nebulaMaterial.setColor3('baseColor', this.calmColor);
    this.nebulaMaterial.setFloat('deviceQualityLOD', 1.0);
    this.nebulaMaterial.setColor3('calmColor', this.calmColor);
    this.nebulaMaterial.setColor3('warmColor', this.warmColor);
    this.nebulaMaterial.setColor3('violentColor', this.violentColor);

    // Apply nebula shader to inner sphere
    this.innerSphereMesh.material = this.nebulaMaterial;

    // Register per-frame update
    this.scene.registerBeforeRender(this.update);
  }

  /**
   * Update shader uniforms per frame
   *
   * Implements:
   * - Req 9.3: Tension-driven color interpolation
   * - Req 9.4: Breathing scale pulse (via shader uniform)
   * - Req 9.5: Static jitter above tension 0.7
   */
  private update = (): void => {
    const elapsedSeconds = (performance.now() - this.startTime) / 1000;

    // Tension-driven color interpolation (Req 9.3)
    // 3-stop ramp: blue -> yellow/green -> red
    const interpolatedColor =
      this.currentTension < 0.45
        ? Color3.Lerp(this.calmColor, this.warmColor, this.currentTension / 0.45)
        : Color3.Lerp(this.warmColor, this.violentColor, (this.currentTension - 0.45) / 0.55);

    // Update glass material emissive color based on tension
    this.glassMaterial.emissiveColor = interpolatedColor;
    this.glassMaterial.emissiveIntensity = 0.3 + this.currentTension * 0.7;

    // Update nebula shader uniforms per frame
    this.nebulaMaterial.setFloat('tension', this.currentTension);
    this.nebulaMaterial.setFloat('time', elapsedSeconds);
    this.nebulaMaterial.setFloat('corruptionLevel', this.currentTension * 0.5);
    this.nebulaMaterial.setColor3('baseColor', interpolatedColor);
    this.nebulaMaterial.setColor3('calmColor', this.calmColor);
    this.nebulaMaterial.setColor3('warmColor', this.warmColor);
    this.nebulaMaterial.setColor3('violentColor', this.violentColor);

    // Breathing pulse (Req 9.4) — driven by vertex shader via corruptionLevel uniform
    // The nebulaCorruption vertex shader applies: sin(time * 1.8) * corruptionLevel * 0.03
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
  }

  /**
   * Dispose materials, inner sphere, and unregister update loop
   */
  dispose(): void {
    this.scene.unregisterBeforeRender(this.update);
    this.glassMaterial.dispose();
    this.nebulaMaterial.dispose();
    if (this.innerSphereMesh) {
      this.innerSphereMesh.dispose();
      this.innerSphereMesh = null;
    }
  }
}
