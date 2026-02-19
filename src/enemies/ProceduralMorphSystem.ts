import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { MorphTarget } from '@babylonjs/core/Morph/morphTarget';
import { MorphTargetManager } from '@babylonjs/core/Morph/morphTargetManager';
import type { Scene } from '@babylonjs/core/scene';
import type { World } from 'miniplex';
import type { GameEntity, YukaTrait } from '../types';

/**
 * ProceduralMorphSystem — GPU vertex morphing for 7 Yuka enemy traits
 *
 * Implements Requirement 11: Procedural morph-based enemies with 7 distinct behavioral traits.
 * Each trait has a unique vertex morph shape and Yuka AI behavior.
 *
 * Source: ARCH v3.6 ProceduralMorphSystem.ts
 */
export class ProceduralMorphSystem {
  private static instance: ProceduralMorphSystem | null = null;
  private scene: Scene;
  private world: World<GameEntity>;
  private currentTension = 0.0;
  private deviceTier: 'low' | 'mid' | 'high' = 'high';
  private morphSpeed = 1.0;

  private constructor(scene: Scene, world: World<GameEntity>) {
    this.scene = scene;
    this.world = world;
  }

  static getInstance(scene?: Scene, world?: World<GameEntity>): ProceduralMorphSystem {
    if (!ProceduralMorphSystem.instance) {
      if (!scene || !world) {
        throw new Error('ProceduralMorphSystem: scene and world required for first initialization');
      }
      ProceduralMorphSystem.instance = new ProceduralMorphSystem(scene, world);
    }
    return ProceduralMorphSystem.instance;
  }

  /**
   * Initialize system with device quality tier
   */
  init(deviceTier: 'low' | 'mid' | 'high'): void {
    this.deviceTier = deviceTier;
  }

  /**
   * TensionSystem listener interface
   */
  setTension(tension: number): void {
    this.currentTension = tension;
  }

  /**
   * Create a Yuka enemy mesh with morph targets for the given trait
   * Returns the mesh and MorphTargetManager
   */
  createMorphedEnemy(trait: YukaTrait, position: Vector3): { mesh: Mesh; manager: MorphTargetManager } {
    // Base mesh: icosphere (subdivisions based on device tier)
    const subdivisions = this.deviceTier === 'low' ? 1 : this.deviceTier === 'mid' ? 2 : 3;
    const mesh = MeshBuilder.CreateIcoSphere(`enemy_${trait}_${Date.now()}`, { radius: 0.3, subdivisions }, this.scene);
    mesh.position = position;

    // Material: neon glow based on trait
    const material = new StandardMaterial(`mat_${trait}`, this.scene);
    material.emissiveColor = this.getTraitColor(trait);
    material.diffuseColor = Color3.Black();
    mesh.material = material;

    // Create MorphTargetManager
    const manager = new MorphTargetManager(this.scene);
    mesh.morphTargetManager = manager;

    // Create morph target for this trait
    const morphTarget = this.createMorphTargetForTrait(mesh, trait);
    manager.addTarget(morphTarget);

    return { mesh, manager };
  }

  /**
   * Create a MorphTarget with vertex offsets for the given trait
   */
  private createMorphTargetForTrait(baseMesh: Mesh, trait: YukaTrait): MorphTarget {
    const morphTarget = MorphTarget.FromMesh(baseMesh, `morph_${trait}`, 0);

    // Get vertex positions
    const positions = baseMesh.getVerticesData('position');
    if (!positions) {
      throw new Error('ProceduralMorphSystem: base mesh has no position data');
    }

    // Apply trait-specific vertex offset function (Req 11.2)
    const morphedPositions = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const [mx, my, mz] = this.applyTraitMorph(trait, x, y, z, i / 3);
      morphedPositions[i] = mx;
      morphedPositions[i + 1] = my;
      morphedPositions[i + 2] = mz;
    }

    morphTarget.setPositions(morphedPositions);
    return morphTarget;
  }

  /**
   * Apply trait-specific vertex offset function
   * Returns [x, y, z] morphed position
   */
  private applyTraitMorph(
    trait: YukaTrait,
    x: number,
    y: number,
    z: number,
    vertexIndex: number,
  ): [number, number, number] {
    switch (trait) {
      case 'NeonRaymarcher':
        // Base neon trails — minimal morph, just slight elongation
        return [x * 1.1, y, z * 1.1];

      case 'TendrilBinder':
        // Stretch tendrils downward (y -= 0.4)
        return [x, y - 0.4, z];

      case 'PlatterCrusher':
        // Flatten + widen (y *= 0.3)
        return [x * 1.5, y * 0.3, z * 1.5];

      case 'GlassShatterer':
        // Jagged spikes (x += sin(i) * 0.15)
        return [
          x + Math.sin(vertexIndex) * 0.15,
          y + Math.cos(vertexIndex) * 0.15,
          z + Math.sin(vertexIndex * 0.7) * 0.15,
        ];

      case 'EchoRepeater':
        // Self-duplication morph — slight scale variation
        return [x * 0.9, y * 0.9, z * 0.9];

      case 'LeverSnatcher':
        // Targets MODE_LEVER — elongated toward lever position
        return [x * 1.2, y, z * 0.8];

      case 'SphereCorruptor': {
        // Sphere-like blob morph — normalize to sphere
        const len = Math.sqrt(x * x + y * y + z * z);
        const scale = 0.4 / (len || 1);
        return [x * scale, y * scale, z * scale];
      }

      default:
        return [x, y, z];
    }
  }

  /**
   * Get emissive color for trait
   */
  private getTraitColor(trait: YukaTrait): Color3 {
    switch (trait) {
      case 'NeonRaymarcher':
        return new Color3(0.0, 1.0, 1.0); // cyan
      case 'TendrilBinder':
        return new Color3(1.0, 0.0, 1.0); // magenta
      case 'PlatterCrusher':
        return new Color3(1.0, 0.5, 0.0); // orange
      case 'GlassShatterer':
        return new Color3(0.8, 0.8, 1.0); // light blue
      case 'EchoRepeater':
        return new Color3(0.5, 0.0, 1.0); // purple
      case 'LeverSnatcher':
        return new Color3(1.0, 1.0, 0.0); // yellow
      case 'SphereCorruptor':
        return new Color3(1.0, 0.0, 0.0); // red
      default:
        return new Color3(1.0, 1.0, 1.0);
    }
  }

  /**
   * Update morph progress for all active Yuka enemies
   * Called per frame via scene.registerBeforeRender
   */
  update(deltaTime: number): void {
    const enemies = this.world.with('enemy', 'yuka', 'morphTarget', 'currentTrait', 'morphProgress');

    for (const entity of enemies) {
      // Update morphProgress based on tension (Req 11.3)
      // morphProgress = lerp(0, 1, tension × 1.5)
      const targetProgress = Math.min(1.0, this.currentTension * 1.5 * this.morphSpeed);
      const currentProgress = entity.morphProgress ?? 0;
      const newProgress = currentProgress + (targetProgress - currentProgress) * deltaTime * 2.0;
      entity.morphProgress = Math.max(0, Math.min(1.0, newProgress));

      // Apply morph progress to MorphTargetManager
      if (entity.morphTarget?.manager) {
        const manager = entity.morphTarget.manager as MorphTargetManager;
        if (manager.numTargets > 0) {
          const target = manager.getTarget(0);
          target.influence = entity.morphProgress;
        }
      }

      // Dispose enemy if morphProgress reaches 0 (countered)
      if (entity.morphProgress <= 0 && entity.morphTarget?.mesh) {
        entity.morphTarget.mesh.dispose();
        this.world.remove(entity);
      }
    }
  }

  /**
   * Counter mechanic: reduce morphProgress by grip strength
   * Called by HandInteractionSystem or PhoneProjectionTouchSystem
   */
  counterEnemy(entity: GameEntity, gripStrength: number): void {
    if (!entity.morphProgress) return;
    // Req 11.4: gripStrength × 0.15 reduces morphProgress
    entity.morphProgress -= gripStrength * 0.15;
    if (entity.morphProgress <= 0) {
      entity.morphProgress = 0;
      // Disposal handled in update loop
    }
  }

  /**
   * Set morph speed multiplier (from DifficultyScalingSystem)
   */
  setMorphSpeed(speed: number): void {
    this.morphSpeed = speed;
  }

  /**
   * Reset for new Dream
   */
  reset(): void {
    // Dispose all active enemies
    const enemies = this.world.with('enemy', 'yuka');
    for (const entity of enemies) {
      if (entity.morphTarget?.mesh) {
        entity.morphTarget.mesh.dispose();
      }
      this.world.remove(entity);
    }
    this.currentTension = 0.0;
    this.morphSpeed = 1.0;
  }

  /**
   * Dispose system
   */
  dispose(): void {
    this.reset();
    ProceduralMorphSystem.instance = null;
  }
}
