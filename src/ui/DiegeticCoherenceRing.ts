import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';

/**
 * DiegeticCoherenceRing — Torus mesh parented to sphere showing tension state
 *
 * Requirement 19.1: Torus mesh (diameter 0.58m, thickness 0.01m, 64 tessellation) parented to Sphere with emissive PBR material
 * Requirement 19.2: Shifts emissive color from blue-green (low tension) to red (high tension) and scales by 1.0 + tension × 0.2
 *
 * Source: ARCH v3.7 DiegeticCoherenceRing
 */
export class DiegeticCoherenceRing {
  private mesh: Mesh;
  private material: PBRMaterial;
  private currentTension = 0.0;

  // Color interpolation endpoints
  private readonly calmColor = new Color3(0.1, 0.8, 0.9); // blue-green
  private readonly violentColor = new Color3(1.0, 0.3, 0.1); // red

  constructor(scene: Scene, sphereMesh: Mesh) {
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

    // Create emissive PBR material
    this.material = new PBRMaterial('coherenceRingMaterial', scene);
    this.material.metallic = 0.0;
    this.material.roughness = 0.2;
    this.material.emissiveColor = this.calmColor.clone();
    this.material.emissiveIntensity = 1.5;

    this.mesh.material = this.material;

    // Initial scale
    this.mesh.scaling.setAll(1.0);
  }

  /**
   * Update tension value and interpolate color/scale
   * Called by TensionSystem listener
   */
  setTension(tension: number): void {
    this.currentTension = tension;

    // Interpolate emissive color from calm blue-green to violent red
    this.material.emissiveColor = Color3.Lerp(this.calmColor, this.violentColor, tension);

    // Scale by 1.0 + tension × 0.2
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
   * Reset to calm state
   */
  reset(): void {
    this.setTension(0.0);
  }

  /**
   * Dispose mesh and material
   */
  dispose(): void {
    this.mesh.dispose();
    this.material.dispose();
  }
}
