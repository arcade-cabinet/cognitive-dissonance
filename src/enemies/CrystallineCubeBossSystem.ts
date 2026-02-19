import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import { world } from '../ecs/World';
import type { MechanicalDegradationSystem } from '../fallback/MechanicalDegradationSystem';
import type { TensionSystem } from '../systems/TensionSystem';
import type { GameEntity } from '../types';
import type { ProceduralMorphSystem } from './ProceduralMorphSystem';

/**
 * CrystallineCubeBossSystem — Singleton
 *
 * Spawns a crystalline cube boss at tension ≥ bossSpawnThreshold (from DifficultyScalingSystem, range [0.6, 0.92])
 * OR 3 consecutive missed patterns. Executes a 5-phase GSAP timeline:
 * 1. Emerge: cube appears above platter
 * 2. Descend: 2.5s power2.in ease toward platter
 * 3. Slam prep: scaling 1.3x/0.7y/1.3z over 0.8s
 * 4. Impact: 0.4s power4.out to platter surface, triggers world impact + tension 0.98 + heavy haptic
 * 5. Resolve: counter phase — health -= totalGripStrength × 0.012/frame
 *
 * Success (health ≤ 0): shatter into 7 Yuka shards (one per trait), dispose boss
 * Failure (health > 0.3): permanent platter deformation, tension → 0.999
 *
 * Source: ARCH v3.5 CrystallineCubeBossSystem.ts
 */
export class CrystallineCubeBossSystem {
  private static instance: CrystallineCubeBossSystem | null = null;

  private scene: Scene | null = null;
  private tensionSystem: TensionSystem | null = null;
  private degradationSystem: MechanicalDegradationSystem | null = null;
  private morphSystem: ProceduralMorphSystem | null = null;

  private bossMesh: Mesh | null = null;
  private bossEntity: GameEntity | null = null;
  private timeline: gsap.core.Timeline | null = null;

  private consecutiveMissedPatterns = 0;
  private bossActive = false;
  private currentPhase = 0; // 0-4 for 5 phases
  private bossHealth = 1.0;

  private platterMesh: Mesh | null = null;
  private bossSpawnThreshold = 0.92; // Default, will be updated by DifficultyScalingSystem

  private constructor() {}

  static getInstance(): CrystallineCubeBossSystem {
    if (!CrystallineCubeBossSystem.instance) {
      CrystallineCubeBossSystem.instance = new CrystallineCubeBossSystem();
    }
    return CrystallineCubeBossSystem.instance;
  }

  initialize(
    scene: Scene,
    tensionSystem: TensionSystem,
    degradationSystem: MechanicalDegradationSystem,
    morphSystem: ProceduralMorphSystem,
    platterMesh: Mesh,
  ): void {
    this.scene = scene;
    this.tensionSystem = tensionSystem;
    this.degradationSystem = degradationSystem;
    this.morphSystem = morphSystem;
    this.platterMesh = platterMesh;

    // Register per-frame update
    scene.registerBeforeRender(this.update);
  }

  /**
   * Called by PatternStabilizationSystem when a pattern is missed
   */
  onPatternMissed(): void {
    this.consecutiveMissedPatterns++;
    if (this.consecutiveMissedPatterns >= 3 && !this.bossActive) {
      this.spawnBoss();
    }
  }

  /**
   * Called by PatternStabilizationSystem when a pattern is successfully stabilized
   */
  onPatternStabilized(): void {
    this.consecutiveMissedPatterns = 0;
  }

  /**
   * Called by DifficultyScalingSystem to update boss spawn threshold
   */
  setBossSpawnThreshold(threshold: number): void {
    this.bossSpawnThreshold = threshold;
  }

  /**
   * Called by TensionSystem listener
   */
  setTension(tension: number): void {
    if (tension >= this.bossSpawnThreshold && !this.bossActive) {
      this.spawnBoss();
    }
  }

  /**
   * Called by HandInteractionSystem or PhoneProjectionTouchSystem during counter phase
   */
  counterBoss(gripStrength: number): void {
    if (!this.bossActive || this.currentPhase !== 4) return;
    this.bossHealth -= gripStrength * 0.012;
  }

  private spawnBoss(): void {
    if (!this.scene || !this.platterMesh || this.bossActive) return;

    this.bossActive = true;
    this.currentPhase = 0;
    this.bossHealth = 1.0;

    // Create boss mesh: 0.6m cube with crystalline PBR material
    this.bossMesh = MeshBuilder.CreateBox('crystallineCubeBoss', { size: 0.6 }, this.scene);

    const material = new PBRMaterial('crystallineBossMaterial', this.scene);
    material.metallic = 0.1;
    material.roughness = 0.2;
    material.albedoColor = new Color3(0.7, 0.9, 1.0); // Icy blue
    material.emissiveColor = new Color3(0.3, 0.5, 0.8);
    material.alpha = 0.85; // Translucent crystalline
    this.bossMesh.material = material;

    // Position above platter (1.2m above platter surface)
    const platterY = this.platterMesh.position.y;
    this.bossMesh.position = new Vector3(0, platterY + 1.2, 0);

    // Create ECS entity
    this.bossEntity = world.add({
      boss: true,
      cubeCrystalline: true,
      crushPhase: 0,
      health: 1.0,
      worldImpact: false,
      position: { x: 0, y: platterY + 1.2, z: 0 },
    });

    // Execute 5-phase GSAP timeline
    this.executeTimeline();
  }

  private executeTimeline(): void {
    if (!this.bossMesh || !this.platterMesh) return;

    const platterY = this.platterMesh.position.y;

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.onTimelineComplete();
      },
    });

    // Phase 0: Emerge (cube appears, fade in alpha from 0 to 0.85)
    this.timeline.fromTo(
      this.bossMesh.material,
      { alpha: 0 },
      {
        alpha: 0.85,
        duration: 0.6,
        ease: 'power2.out',
        onStart: () => {
          this.currentPhase = 0;
        },
      },
    );

    // Phase 1: Descend (2.5s power2.in toward platter)
    this.timeline.to(this.bossMesh.position, {
      y: platterY + 0.3,
      duration: 2.5,
      ease: 'power2.in',
      onStart: () => {
        this.currentPhase = 1;
      },
    });

    // Phase 2: Slam prep (scaling 1.3x/0.7y/1.3z over 0.8s)
    this.timeline.to(this.bossMesh.scaling, {
      x: 1.3,
      y: 0.7,
      z: 1.3,
      duration: 0.8,
      ease: 'power4.in',
      onStart: () => {
        this.currentPhase = 2;
      },
    });

    // Phase 3: Impact (0.4s power4.out to platter surface)
    this.timeline.to(this.bossMesh.position, {
      y: platterY - 0.1,
      duration: 0.4,
      ease: 'power4.out',
      onStart: () => {
        this.currentPhase = 3;
      },
      onComplete: () => {
        this.onImpact();
      },
    });

    // Phase 4: Resolve (counter phase — 4 seconds for player to counter)
    this.timeline.to(
      {},
      {
        duration: 4.0,
        onStart: () => {
          this.currentPhase = 4;
        },
        onComplete: () => {
          this.onResolve();
        },
      },
    );
  }

  private onImpact(): void {
    // Trigger world impact in MechanicalDegradationSystem
    if (this.degradationSystem) {
      this.degradationSystem.triggerWorldImpact();
    }

    // Set tension to 0.98
    if (this.tensionSystem) {
      this.tensionSystem.setTension(0.98);
    }

    // TODO: Fire heavy haptic pulse (will be implemented in Task 21 MechanicalHaptics)
    // MechanicalHaptics.triggerContact(1.0, 'leverPull');
  }

  private onResolve(): void {
    if (this.bossHealth <= 0) {
      // Success: shatter into Yuka shards
      this.shatterBoss();
    } else if (this.bossHealth > 0.3) {
      // Failure: permanent deformation + tension → 0.999
      if (this.degradationSystem) {
        this.degradationSystem.triggerWorldImpact(); // Permanent deformation
      }
      if (this.tensionSystem) {
        this.tensionSystem.setTension(0.999); // Triggers sphere shatter
      }
      this.disposeBoss();
    } else {
      // Partial success: dispose boss without penalty
      this.disposeBoss();
    }
  }

  private shatterBoss(): void {
    if (!this.bossMesh || !this.scene || !this.morphSystem) return;

    // Spawn 7 Yuka shards (one per trait) at boss position
    const traits: Array<
      | 'NeonRaymarcher'
      | 'TendrilBinder'
      | 'PlatterCrusher'
      | 'GlassShatterer'
      | 'EchoRepeater'
      | 'LeverSnatcher'
      | 'SphereCorruptor'
    > = [
      'NeonRaymarcher',
      'TendrilBinder',
      'PlatterCrusher',
      'GlassShatterer',
      'EchoRepeater',
      'LeverSnatcher',
      'SphereCorruptor',
    ];

    const bossPos = this.bossMesh.position.clone();
    for (const trait of traits) {
      // Offset each shard radially from boss center
      const angle = (traits.indexOf(trait) / traits.length) * Math.PI * 2;
      const offset = new Vector3(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3);
      const shardPos = bossPos.add(offset);

      this.morphSystem.createMorphedEnemy(trait, shardPos);
    }

    this.disposeBoss();
  }

  private disposeBoss(): void {
    if (this.bossMesh) {
      this.bossMesh.dispose();
      this.bossMesh = null;
    }

    if (this.bossEntity) {
      world.remove(this.bossEntity);
      this.bossEntity = null;
    }

    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }

    this.bossActive = false;
    this.currentPhase = 0;
    this.bossHealth = 1.0;
    this.consecutiveMissedPatterns = 0;
  }

  private onTimelineComplete(): void {
    // Timeline completed — resolve phase should have handled success/failure
    // This is a safety net in case resolve didn't trigger
    if (this.bossActive) {
      this.onResolve();
    }
  }

  private readonly update = (): void => {
    if (!this.bossActive || !this.bossEntity) return;

    // Update ECS entity with current boss state
    this.bossEntity.crushPhase = this.currentPhase;
    this.bossEntity.health = this.bossHealth;
  };

  reset(): void {
    this.disposeBoss();
    this.consecutiveMissedPatterns = 0;
  }

  dispose(): void {
    if (this.scene) {
      this.scene.unregisterBeforeRender(this.update);
    }
    this.disposeBoss();
    this.scene = null;
    this.tensionSystem = null;
    this.degradationSystem = null;
    this.morphSystem = null;
    this.platterMesh = null;
  }
}
