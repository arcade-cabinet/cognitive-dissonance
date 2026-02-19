import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { SolidParticleSystem } from '@babylonjs/core/Particles/solidParticleSystem';
import type { Scene } from '@babylonjs/core/scene';
import { TensionSystem } from './TensionSystem';

/**
 * CorruptionTendrilSystem — Singleton managing colored corruption tendrils
 *
 * Tendrils are SolidParticle cylinders that escape from the Sphere center toward the rim.
 * Spawning begins when tension > 0.3, rate proportional to tension.
 * Holding a matching keycap retracts the corresponding tendril and decreases tension by 0.03.
 *
 * Validates:
 * - Requirement 7.1: SolidParticleSystem with up to 24 tendril shapes
 * - Requirement 7.2: Tension-proportional spawn rate (threshold > 0.3)
 * - Requirement 7.3: Tendril retraction on keycap hold (tension -0.03)
 * - Requirement 7.4: Buried_Seed-derived color palette
 */
export class CorruptionTendrilSystem {
  private static instance: CorruptionTendrilSystem | null = null;

  private sps: SolidParticleSystem | null = null;
  private scene: Scene | null = null;
  private colorPalette: Color3[] = [];
  private activeTendrils: Map<string, number> = new Map(); // keyName → particle index
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 1000; // ms, will be scaled by tension
  private maxTendrils: number = 24;
  private tensionThreshold: number = 0.3;

  private constructor() {}

  static getInstance(): CorruptionTendrilSystem {
    if (!CorruptionTendrilSystem.instance) {
      CorruptionTendrilSystem.instance = new CorruptionTendrilSystem();
    }
    return CorruptionTendrilSystem.instance;
  }

  /**
   * Initialize the SolidParticleSystem with 24 cylinder tendril shapes
   * @param scene Babylon.js scene
   * @param sphereMesh The sphere mesh to parent tendrils to
   * @param seedHash Buried seed hash for color palette derivation
   */
  init(scene: Scene, sphereMesh: AbstractMesh, seedHash: number): void {
    this.scene = scene;
    this.colorPalette = this.deriveColorPalette(seedHash);

    // Create SolidParticleSystem with 24 cylinder shapes
    this.sps = new SolidParticleSystem('corruptionTendrils', scene, {
      updatable: true,
      isPickable: false,
    });

    // Create cylinder shape for tendrils (thin, elongated)
    const cylinder = MeshBuilder.CreateCylinder(
      'tendrilShape',
      { height: 0.5, diameter: 0.02, tessellation: 8 },
      scene,
    );

    // Add 24 shapes to SPS
    this.sps.addShape(cylinder, this.maxTendrils);
    cylinder.dispose();

    // Build the SPS mesh
    const spsMesh = this.sps.buildMesh();
    spsMesh.parent = sphereMesh;

    // Create material with emissive color
    const material = new StandardMaterial('tendrilMaterial', scene);
    material.emissiveColor = Color3.White();
    material.disableLighting = true;
    spsMesh.material = material;

    // Initialize all particles as invisible
    this.sps.initParticles = () => {
      if (!this.sps) return;
      for (let i = 0; i < this.sps.nbParticles; i++) {
        const particle = this.sps.particles[i];
        if (!particle) continue;
        particle.isVisible = false;
        particle.position = Vector3.Zero();
        particle.scaling = new Vector3(1, 1, 1);
      }
    };
    this.sps.initParticles();

    // Update function for particle animation
    this.sps.updateParticle = (particle) => {
      if (!particle.isVisible) return particle;

      // Animate tendril growth from center to rim
      const growthSpeed = 0.02; // units per frame
      particle.position.y += growthSpeed;

      // Check if tendril reached rim (y > 0.26, sphere radius is 0.26m)
      if (particle.position.y > 0.26) {
        particle.isVisible = false;
        // Remove from active tendrils
        for (const [key, idx] of this.activeTendrils.entries()) {
          if (idx === particle.idx) {
            this.activeTendrils.delete(key);
            break;
          }
        }
      }

      return particle;
    };

    console.log('[CorruptionTendrilSystem] Initialized with', this.maxTendrils, 'tendril shapes');
  }

  /**
   * Per-frame update — spawn tendrils based on tension
   */
  update(_deltaTime: number): void {
    if (!this.sps || !this.scene) return;

    const tension = TensionSystem.getInstance().currentTension;

    // Only spawn if tension > threshold
    if (tension > this.tensionThreshold) {
      const now = performance.now();
      const spawnRate = this.spawnInterval / (1 + tension * 2); // faster spawning at higher tension

      if (now - this.lastSpawnTime > spawnRate) {
        this.spawnTendril();
        this.lastSpawnTime = now;
      }
    }

    // Update SPS
    this.sps.setParticles();
  }

  /**
   * Spawn a new tendril from sphere center
   */
  private spawnTendril(): void {
    if (!this.sps) return;

    // Find first invisible particle
    const particle = this.sps.particles.find((p) => !p.isVisible);
    if (!particle) return; // All tendrils active

    // Make visible and position at sphere center
    particle.isVisible = true;
    particle.position = Vector3.Zero();
    particle.rotation = new Vector3(0, 0, 0);

    // Assign random color from palette
    const color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    particle.color = new Color4(color.r, color.g, color.b, 1.0);

    // Assign to a random keycap (for now, just use particle index as key)
    const keyName = `key_${particle.idx}`;
    this.activeTendrils.set(keyName, particle.idx);
  }

  /**
   * Retract a tendril when matching keycap is held
   * @param keyName The keycap name
   */
  retractFromKey(keyName: string): void {
    if (!this.sps) return;

    const particleIdx = this.activeTendrils.get(keyName);
    if (particleIdx === undefined) return;

    const particle = this.sps.particles[particleIdx];
    if (!particle || !particle.isVisible) return;

    // Hide particle (retract)
    particle.isVisible = false;
    this.activeTendrils.delete(keyName);

    // Decrease tension by 0.03 (Requirement 7.3)
    TensionSystem.getInstance().decrease(0.03);

    console.log(`[CorruptionTendrilSystem] Retracted tendril for ${keyName}, tension -0.03`);
  }

  /**
   * Derive color palette from buried seed hash
   * @param seedHash Buried seed hash
   * @returns Array of 5 colors
   */
  private deriveColorPalette(seedHash: number): Color3[] {
    // Simple PRNG from seed
    let seed = seedHash;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed >>> 0) / 4294967296;
    };

    // Generate 5 colors with high saturation
    const colors: Color3[] = [];
    for (let i = 0; i < 5; i++) {
      const hue = rng();
      const saturation = 0.8 + rng() * 0.2; // 0.8–1.0
      const value = 0.9 + rng() * 0.1; // 0.9–1.0
      colors.push(Color3.FromHSV(hue * 360, saturation, value));
    }

    return colors;
  }

  /**
   * Reset for new Dream
   */
  reset(): void {
    if (!this.sps) return;

    // Hide all particles
    for (let i = 0; i < this.sps.nbParticles; i++) {
      this.sps.particles[i].isVisible = false;
    }
    this.activeTendrils.clear();
    this.lastSpawnTime = 0;

    console.log('[CorruptionTendrilSystem] Reset');
  }

  /**
   * Dispose system
   */
  dispose(): void {
    if (this.sps) {
      this.sps.dispose();
      this.sps = null;
    }
    this.scene = null;
    this.activeTendrils.clear();
    console.log('[CorruptionTendrilSystem] Disposed');
  }
}
