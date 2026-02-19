import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { SolidParticleSystem } from '@babylonjs/core/Particles/solidParticleSystem';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import * as Tone from 'tone';
import { world } from '../ecs/World';
import { useSeedStore } from '../store/seed-store';

/**
 * ShatterSequence
 *
 * Implements the sphere shatter sequence per Req 38 and design doc timeline:
 *
 * t=0ms      tension hits 0.999 → freeze all gameplay systems
 * t=200ms    sphere fracture → 64 glass-shard SolidParticles with seed-derived velocities
 * t=200ms    haptic burst → expo-haptics Heavy + navigator.vibrate + Tone.js glass-shatter SFX
 * t=200ms    enemy freeze + fade → all YukaEnemy entities velocity→0, alpha→0 over 800ms
 * t=200ms    platter shutdown → rotation stop + keycap retract (GSAP reverse, 400ms)
 * t=600ms    "COGNITION SHATTERED" text appears (handled by TitleAndGameOverSystem)
 * t=4000ms   restart enabled (handled by GamePhaseManager)
 *
 * Total duration: ~5.6s
 */
export class ShatterSequence {
  private static instance: ShatterSequence | null = null;
  private scene: Scene | null = null;
  private sphereMesh: Mesh | null = null;
  private platterMesh: Mesh | null = null;
  private keycapMeshes: Mesh[] = [];
  private shardSPS: SolidParticleSystem | null = null;
  private isShattered = false;
  private glassShatterSynth: Tone.NoiseSynth | null = null;

  private constructor() {}

  static getInstance(): ShatterSequence {
    if (!ShatterSequence.instance) {
      ShatterSequence.instance = new ShatterSequence();
    }
    return ShatterSequence.instance;
  }

  /**
   * Initialize with scene and mesh references
   */
  initialize(scene: Scene, sphereMesh: Mesh, platterMesh: Mesh, keycapMeshes: Mesh[]): void {
    this.scene = scene;
    this.sphereMesh = sphereMesh;
    this.platterMesh = platterMesh;
    this.keycapMeshes = keycapMeshes;
    this.isShattered = false;

    // Initialize glass-shatter SFX synth (white noise → highpass 2000Hz → gain envelope)
    this.glassShatterSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0 },
    }).toDestination();

    const filter = new Tone.Filter(2000, 'highpass').toDestination();
    this.glassShatterSynth.connect(filter);
  }

  /**
   * Trigger the full shatter sequence
   * Called when tension reaches 0.999
   */
  trigger(): void {
    if (this.isShattered || !this.scene || !this.sphereMesh) {
      return;
    }

    this.isShattered = true;

    // Phase 1: 200ms freeze (handled by TensionSystem.freeze() — called externally)

    // Phase 2-5: Execute after 200ms delay
    setTimeout(() => {
      this.fractureSphere();
      this.triggerHapticBurst();
      this.freezeAndFadeEnemies();
      this.shutdownPlatter();
    }, 200);

    // Phase 6: Text display at t=600ms (handled by TitleAndGameOverSystem — called externally)
  }

  /**
   * Phase 2: Fracture sphere into 64 glass-shard SolidParticles
   * Shards inherit sphere's current nebula color (tension-interpolated red)
   * Velocities: outward radial + seed-derived angular offset
   */
  private fractureSphere(): void {
    if (!this.scene || !this.sphereMesh) return;

    const rng = useSeedStore.getState().rng;
    const spherePosition = this.sphereMesh.position.clone();
    const sphereColor = this.getSphereColor();

    // Hide original sphere
    this.sphereMesh.isVisible = false;

    // Create SolidParticleSystem with 64 glass-shard particles
    this.shardSPS = new SolidParticleSystem('glassShards', this.scene, {
      updatable: true,
    });

    // Create shard shape (small icosphere)
    const shardShape = MeshBuilder.CreateIcoSphere('shardShape', { radius: 0.02, subdivisions: 1 }, this.scene);
    this.shardSPS.addShape(shardShape, 64);
    shardShape.dispose();

    const shardMesh = this.shardSPS.buildMesh();

    // Apply glass material
    const shardMaterial = new StandardMaterial('shardMaterial', this.scene);
    shardMaterial.diffuseColor = sphereColor;
    shardMaterial.emissiveColor = sphereColor.scale(0.3);
    shardMaterial.alpha = 0.6;
    shardMesh.material = shardMaterial;

    // Initialize particles with seed-derived velocities
    this.shardSPS.initParticles = () => {
      for (let i = 0; i < (this.shardSPS?.nbParticles ?? 0); i++) {
        const particle = this.shardSPS?.particles[i];
        if (!particle) continue;

        // Start at sphere center
        particle.position.copyFrom(spherePosition);

        // Radial direction (evenly distributed on sphere surface)
        const theta = (i / 64) * Math.PI * 2;
        const phi = Math.acos(1 - (2 * (i % 8)) / 8);
        const radialDir = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));

        // Seed-derived angular offset
        const angularOffset = new Vector3((rng?.() ?? 0.5) - 0.5, (rng?.() ?? 0.5) - 0.5, (rng?.() ?? 0.5) - 0.5).scale(
          0.3,
        );

        // Velocity: radial + angular offset
        particle.velocity = radialDir.scale(2.0 + (rng?.() ?? 0.5)).add(angularOffset);

        // Rotation
        particle.rotationQuaternion = null;
        particle.rotation.set(
          (rng?.() ?? 0.5) * Math.PI * 2,
          (rng?.() ?? 0.5) * Math.PI * 2,
          (rng?.() ?? 0.5) * Math.PI * 2,
        );
      }
    };

    // Update loop: apply gravity, fade out over 3s
    const startTime = performance.now();
    this.shardSPS.updateParticle = (particle) => {
      const elapsed = (performance.now() - startTime) / 1000;

      // Apply gravity
      particle.velocity.y -= 9.81 * 0.016; // ~60fps timestep

      // Update position
      particle.position.addInPlace(particle.velocity.scale(0.016));

      // Fade out over 3s
      if (elapsed > 3.0 && shardMesh.material) {
        (shardMesh.material as StandardMaterial).alpha = Math.max(0, 0.6 - (elapsed - 3.0) * 0.6);
      }

      // Dispose after 4s
      if (elapsed > 4.0) {
        shardMesh.dispose();
        this.shardSPS = null;
      }

      return particle;
    };

    this.shardSPS.initParticles();
    this.shardSPS.setParticles();

    // Register update loop
// Register update loop
const updateLoop = () => {
  if (this.shardSPS) {
    this.shardSPS.setParticles();
  }
};

this.scene.registerBeforeRender(updateLoop);

// Unregister after 4s when shards are fully disposed
setTimeout(() => {
  this.scene?.unregisterBeforeRender(updateLoop);
}, 4000);
  }

  /**
   * Phase 3: Trigger haptic burst
   * - expo-haptics: Heavy impact (native)
   * - navigator.vibrate: 200ms (web)
   * - Tone.js: glass-shatter SFX (white noise → highpass 2000Hz, 400ms decay)
   */
  private triggerHapticBurst(): void {
    // Native haptics (expo-haptics)
    // biome-ignore lint/suspicious/noExplicitAny: expo-haptics not typed in this context
    if (typeof (globalThis as any).ExpoHaptics !== 'undefined') {
      // biome-ignore lint/suspicious/noExplicitAny: expo-haptics not typed in this context
      (globalThis as any).ExpoHaptics.impactAsync('heavy');
    }

    // Web haptics (navigator.vibrate)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Audio SFX
    if (this.glassShatterSynth) {
      this.glassShatterSynth.triggerAttackRelease('16n', Tone.now());
    }
  }

  /**
   * Phase 4: Freeze and fade all Yuka enemies
   * - Velocity → Vector3.Zero()
   * - Alpha → 0 over 800ms via GSAP
   * - Dispose after fade completes
   */
  private freezeAndFadeEnemies(): void {
    if (!this.scene) return;

    // Query all YukaEnemy entities
    const enemies = world.with('enemy', 'yuka', 'morphTarget');

    for (const entity of enemies) {
      const morphData = entity.morphTarget;
      if (!morphData || typeof morphData === 'number') continue;

      const enemyMesh = morphData.mesh;

      // Freeze velocity (set to zero)
      if (entity.velocity) {
        entity.velocity.x = 0;
        entity.velocity.y = 0;
        entity.velocity.z = 0;
      }

      // Fade alpha 1→0 over 800ms, then dispose
      if (enemyMesh.material) {
        gsap.to(enemyMesh.material, {
          alpha: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => {
            enemyMesh.dispose();
            world.remove(entity);
          },
        });
      }
    }
  }

  /**
   * Phase 5: Shutdown platter
   * - Stop rotation (GSAP to 0 over 400ms, power2.out ease)
   * - Retract all keycaps (GSAP reverse MotionPath, 400ms)
   */
  private shutdownPlatter(): void {
    if (!this.platterMesh) return;

    // Stop platter rotation
    gsap.to(this.platterMesh.rotation, {
      y: this.platterMesh.rotation.y, // hold current rotation
      duration: 0.4,
      ease: 'power2.out',
    });

    // Retract keycaps (reverse emergence animation)
    for (const keycap of this.keycapMeshes) {
      gsap.to(keycap.position, {
        x: 0,
        y: -0.1, // retract below platter surface
        z: 0,
        duration: 0.4,
        ease: 'power2.in',
      });
    }
  }

  /**
   * Get sphere's current color (tension-interpolated red at shatter time)
   */
  private getSphereColor(): Color3 {
    // At shatter time, tension is 0.999 → violent red
    const calmBlue = new Color3(0.1, 0.6, 1.0);
    const violentRed = new Color3(1.0, 0.3, 0.1);
    return Color3.Lerp(calmBlue, violentRed, 0.999);
  }

  /**
   * Reset for new Dream
   */
  reset(): void {
    this.isShattered = false;

    // Clean up shard SPS if still active
    if (this.shardSPS) {
      const shardMesh = this.shardSPS.mesh;
      if (shardMesh) {
        shardMesh.dispose();
      }
      this.shardSPS = null;
    }

    // Show sphere again
    if (this.sphereMesh) {
      this.sphereMesh.isVisible = true;
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.reset();

    if (this.glassShatterSynth) {
      this.glassShatterSynth.dispose();
      this.glassShatterSynth = null;
    }

    this.scene = null;
    this.sphereMesh = null;
    this.platterMesh = null;
    this.keycapMeshes = [];
  }
}
