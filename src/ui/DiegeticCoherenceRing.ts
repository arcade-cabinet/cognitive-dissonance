import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';

/**
 * DiegeticCoherenceRing — Torus mesh parented to sphere showing tension state (Grok spec)
 *
 * Uses ShaderMaterial with `coherenceRingFill` shader from registry:
 * - Animated fill arc: coherenceLevel uniform (0.0-1.0 = how much ring is filled)
 * - coherenceLevel = 1.0 - tension (full ring at 0 tension, empty at max)
 * - Ring color transitions: blue (calm) -> yellow (warming) -> red (critical) via 3-stop ramp
 * - Subtle pulse animation: ring thickness oscillates with sin(time * 2.0) * 0.001
 *
 * Requirement 19.1: Torus mesh (diameter 0.58m, thickness 0.01m, 64 tessellation) parented to Sphere
 * Requirement 19.2: Coherence ring fill arc and color transitions
 *
 * Source: ARCH v3.7 DiegeticCoherenceRing
 */
export class DiegeticCoherenceRing {
  private mesh: Mesh;
  private material: ShaderMaterial;
  private scene: Scene;
  private currentTension = 0.0;
  private animationTime = 0.0;
  private updateCallback: (() => void) | null = null;

  constructor(scene: Scene, sphereMesh: Mesh) {
    this.scene = scene;

    // Create torus mesh (diameter 0.58m, thickness 0.01m, 64 tessellation)
    this.mesh = MeshBuilder.CreateTorus(
      'coherenceRing',
      {
        diameter: 0.58,
        thickness: 0.01,
        tessellation: 64,
      },
      scene,
    );

    // Parent to sphere
    this.mesh.parent = sphereMesh;

    // Create ShaderMaterial using coherenceRingFill shader from registry
    this.material = new ShaderMaterial(
      'coherenceRingMaterial',
      scene,
      {
        vertex: 'coherenceRingFill',
        fragment: 'coherenceRingFill',
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['worldViewProjection', 'world', 'coherenceLevel', 'time'],
      },
    );

    // Set initial uniforms
    this.material.setFloat('coherenceLevel', 1.0); // Full ring at 0 tension
    this.material.setFloat('time', 0.0);

    this.mesh.material = this.material;

    // Initial scale
    this.mesh.scaling.setAll(1.0);

    // Register per-frame animation update
    this.updateCallback = this.updateAnimation.bind(this);
    this.scene.registerBeforeRender(this.updateCallback);
  }

  /**
   * Per-frame animation update
   * Updates time uniform for pulse animation
   */
  private updateAnimation(): void {
    this.animationTime = performance.now() / 1000.0;
    this.material.setFloat('time', this.animationTime);
  }

  /**
   * Update tension value and coherence ring state
   * Called by TensionSystem listener
   */
  setTension(tension: number): void {
    this.currentTension = tension;

    // coherenceLevel = 1.0 - tension (full ring at 0 tension, empty at max)
    const coherenceLevel = 1.0 - tension;
    this.material.setFloat('coherenceLevel', coherenceLevel);

    // Scale by 1.0 + tension x 0.2
    const scale = 1.0 + tension * 0.2;
    this.mesh.scaling.setAll(scale);
  }

  /**
   * Get current tension value
   */
  getTension(): number {
    return this.currentTension;
  }

  /**
   * Get current coherence level (1.0 - tension)
   */
  getCoherenceLevel(): number {
    return 1.0 - this.currentTension;
  }

  /**
   * Get the ShaderMaterial instance (for testing/inspection)
   */
  getMaterial(): ShaderMaterial {
    return this.material;
  }

  /**
   * Get the torus mesh instance (for testing/inspection)
   */
  getMesh(): Mesh {
    return this.mesh;
  }

  /**
   * Reset to calm state
   */
  reset(): void {
    this.setTension(0.0);
  }

  /**
   * Dispose mesh, material, and animation callback
   */
  dispose(): void {
    if (this.updateCallback) {
      this.scene.unregisterBeforeRender(this.updateCallback);
      this.updateCallback = null;
    }
    this.mesh.dispose();
    this.material.dispose();
  }
}
