import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { SolidParticleSystem } from '@babylonjs/core/Particles/solidParticleSystem';
import type { Scene } from '@babylonjs/core/scene';
import { useSeedStore } from '../store/seed-store';
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
  private tendrilDirections: Map<number, Vector3> = new Map(); // particle idx → radial direction
  private lastSpawnTime: number = 0;
  private spawnInterval: number = 1000; // ms, will be scaled by tension
  private maxTendrils: number = 24;
  private tensionThreshold: number = 0.3;
  private _stopped: boolean = false;

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

    // Create SolidParticleSystem with 24 sinuous tube tendril shapes
    this.sps = new SolidParticleSystem('corruptionTendrils', scene, {
      updatable: true,
      isPickable: false,
    });

    // Create sinuous tube shape for tendrils (replaces primitive cylinder)
    const segments = 12;
    const tendrilPath: Vector3[] = [];
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      tendrilPath.push(
        new Vector3(
          Math.sin(t * Math.PI * 3) * 0.02, // sinuous X
          t * 0.5, // height
          Math.cos(t * Math.PI * 2) * 0.015, // sinuous Z
        ),
      );
    }

    const tendrilShape = MeshBuilder.CreateTube(
      'tendrilShape',
      {
        path: tendrilPath,
        radiusFunction: (_i: number, dist: number) => 0.01 * (1.0 - dist * 0.7), // taper from base to tip
        tessellation: 6,
        cap: Mesh.CAP_ALL,
      },
      scene,
    );

    // Add 24 shapes to SPS
    this.sps.addShape(tendrilShape, this.maxTendrils);
    tendrilShape.dispose();

    // Build the SPS mesh
    const spsMesh = this.sps.buildMesh();
    spsMesh.parent = sphereMesh;

    // Try ShaderMaterial referencing corruptionTendril shader from registry
    let materialApplied = false;
    try {
      const shaderMat = new ShaderMaterial(
        'tendrilShaderMaterial',
        scene,
        { vertex: 'corruptionTendril', fragment: 'corruptionTendril' },
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
          ],
          needAlphaBlending: true,
        },
      );
      shaderMat.setFloat('tension', 0.0);
      shaderMat.setFloat('time', 0.0);
      shaderMat.setFloat('corruptionLevel', 0.0);
      shaderMat.setFloat('deviceQualityLOD', 1.0);
      spsMesh.material = shaderMat;
      materialApplied = true;
    } catch (_e) {
      // ShaderMaterial not available — fall back to StandardMaterial
      materialApplied = false;
    }

    // Fallback: StandardMaterial with emissive color
    if (!materialApplied) {
      const material = new StandardMaterial('tendrilMaterial', scene);
      material.emissiveColor = Color3.White();
      material.disableLighting = true;
      spsMesh.material = material;
    }

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

      // Look up the stored radial direction for this tendril
      const dir = this.tendrilDirections.get(particle.idx);
      if (!dir) return particle;

      // Animate tendril growth outward along its radial direction
      const growthSpeed = 0.02; // units per frame
      particle.position.addInPlace(dir.scale(growthSpeed));

      // Check if tendril reached rim (distance from center > 0.26, sphere radius is 0.26m)
      if (particle.position.length() > 0.26) {
        particle.isVisible = false;
        this.tendrilDirections.delete(particle.idx);
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
   * Stop spawning and updating tendrils (called during shatter phase)
   */
  stop(): void {
    this._stopped = true;
  }

  /**
   * Resume spawning and updating tendrils (called on restart)
   */
  resume(): void {
    this._stopped = false;
  }

  /**
   * Per-frame update — spawn tendrils based on tension
   */
  update(_deltaTime: number): void {
    if (this._stopped) return;
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

    // Assign random color from palette (seed-derived PRNG for determinism)
    const rng = useSeedStore.getState().rng;
    const color = this.colorPalette[Math.floor((rng?.() ?? Math.random()) * this.colorPalette.length)];
    particle.color = new Color4(color.r, color.g, color.b, 1.0);

    // Random direction on sphere surface (spherical coordinates for uniform distribution)
    const theta = (rng?.() ?? Math.random()) * Math.PI * 2;
    const phi = Math.acos(2 * (rng?.() ?? Math.random()) - 1);
    const direction = new Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
    ).normalize();

    // Store direction for this particle's per-frame movement
    this.tendrilDirections.set(particle.idx, direction);

    // Rotate cylinder to align with direction (cylinders default along Y-axis)
    particle.rotation.x = phi - Math.PI / 2;
    particle.rotation.y = theta;

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
    this.tendrilDirections.clear();
    this.lastSpawnTime = 0;
    this._stopped = false;

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
    this.tendrilDirections.clear();
    console.log('[CorruptionTendrilSystem] Disposed');
  }
}
