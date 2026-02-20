/**
 * OrbitalCatch dream handler
 *
 * Mechanics:
 * - Multiple cubes (mix of crystalline and morph) orbit around the sphere
 * - Each cube follows a unique elliptical orbit at different speeds and radii
 * - orbitCount cubes active, each with orbit parameters from slot ranges
 * - Cubes have a "catch angle" that rotates with orbit — aligns with specific keycap
 * - When cube's catch angle aligns with a keycap (within catchWindowDeg), pressing that keycap catches the cube
 * - Caught cube flashes and despawns, new cube spawns
 * - orbitSpeedBase scales with tension: faster orbits at higher tension
 * - Successfully catching reduces tension; missed catch windows increase it
 */

import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { OrbitalCatchSlots } from '../../ecs/components';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

/** Tracks a single orbiting cube */
interface OrbitingCube {
  id: number;
  type: 'crystalline' | 'morph';
  angleDeg: number;        // Current orbit angle (degrees)
  orbitSpeed: number;       // rad/s
  orbitRadius: number;      // Distance from sphere center
  altitude: number;         // Y position
  assignedKeycap: string;   // Which keycap catches this cube
  catchAngleDeg: number;    // Angle at which keycap alignment occurs
  caught: boolean;
  missedWindow: boolean;    // Whether the catch window was missed this pass
}

export class OrbitalCatchHandler implements DreamHandler {
  private scene: Scene | null = null;
  private entity: GameEntity | null = null;

  // Slot parameters
  private orbitCount = 2;
  private orbitSpeedBase = 1.0;
  private orbitRadiusRange: [number, number] = [0.4, 0.8];
  private altitudeRange: [number, number] = [-0.1, 0.3];
  private catchWindowDeg = 20;

  // Runtime state
  private sphereMesh: Mesh | null = null;
  private keycapMeshes: Map<string, Mesh> = new Map();
  private availableLetters: string[] = [];
  private orbitingCubes: OrbitingCube[] = [];
  private nextCubeId = 0;
  private totalCaught = 0;
  private totalMissed = 0;

  activate(entity: GameEntity, scene: Scene): void {
    this.scene = scene;
    this.entity = entity;

    // Read slot params from archetype
    const slots = entity.archetype?.slots as OrbitalCatchSlots | undefined;
    this.orbitCount = slots?.orbitCount ?? 2;
    this.orbitSpeedBase = slots?.orbitSpeedBase ?? 1.0;
    this.orbitRadiusRange = slots?.orbitRadiusRange ?? [0.4, 0.8];
    this.altitudeRange = slots?.altitudeRange ?? [-0.1, 0.3];
    this.catchWindowDeg = slots?.catchWindowDeg ?? 20;

    // Initialize state
    this.orbitingCubes = [];
    this.nextCubeId = 0;
    this.totalCaught = 0;
    this.totalMissed = 0;

    // Find sphere mesh
    this.sphereMesh = scene.getMeshByName('sphere') as Mesh;
    if (!this.sphereMesh) {
      console.warn('[OrbitalCatchHandler] Sphere mesh not found in scene');
    }

    // Find keycap meshes
    const keycapSubset = slots?.keycapSubset ?? ['Q', 'W', 'E', 'R', 'T', 'A'];
    this.availableLetters = [...keycapSubset];
    for (const letter of this.availableLetters) {
      const mesh = scene.getMeshByName(`keycap-${letter}`) as Mesh;
      if (mesh) {
        this.keycapMeshes.set(letter, mesh);
      }
    }

    // Spawn initial cubes
    for (let i = 0; i < this.orbitCount; i++) {
      this.spawnCube();
    }
  }

  update(dt: number): void {
    if (!this.scene || !this.entity) return;

    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Speed scales with tension
    const tensionSpeedMultiplier = 1 + tension * 0.5;

    for (const cube of this.orbitingCubes) {
      if (cube.caught) continue;

      // Update orbit angle
      const speedDeg = (cube.orbitSpeed * tensionSpeedMultiplier * 180) / Math.PI;
      cube.angleDeg = (cube.angleDeg + speedDeg * dt) % 360;

      // Check if catch window was entered and exited (missed)
      const catchDiff = Math.abs(this.normalizeAngle(cube.angleDeg - cube.catchAngleDeg));
      const inWindow = catchDiff <= this.catchWindowDeg / 2;

      if (!inWindow && !cube.missedWindow && cube.angleDeg > cube.catchAngleDeg + this.catchWindowDeg) {
        // Passed through catch window without being caught
        cube.missedWindow = true;
        this.totalMissed++;

        // Tension increase for missed catch
        if (this.scene.metadata) {
          this.scene.metadata.currentTension = Math.min(1, tension + 0.02);
        }
      }

      // Reset missed flag when coming around again
      if (catchDiff > 180) {
        cube.missedWindow = false;
      }
    }

    // Respawn caught cubes
    const activeCubes = this.orbitingCubes.filter((c) => !c.caught);
    if (activeCubes.length < this.orbitCount) {
      const toSpawn = this.orbitCount - activeCubes.length;
      for (let i = 0; i < toSpawn; i++) {
        this.spawnCube();
      }
      // Clean up caught cubes from array
      this.orbitingCubes = this.orbitingCubes.filter((c) => !c.caught);
    }
  }

  private spawnCube(): void {
    const [minR, maxR] = this.orbitRadiusRange;
    const [minA, maxA] = this.altitudeRange;

    const cube: OrbitingCube = {
      id: this.nextCubeId++,
      type: Math.random() > 0.5 ? 'crystalline' : 'morph',
      angleDeg: Math.random() * 360,
      orbitSpeed: this.orbitSpeedBase * (0.8 + Math.random() * 0.4), // +-20% variation
      orbitRadius: minR + Math.random() * (maxR - minR),
      altitude: minA + Math.random() * (maxA - minA),
      assignedKeycap: this.availableLetters[this.nextCubeId % this.availableLetters.length] ?? 'Q',
      catchAngleDeg: Math.random() * 360,
      caught: false,
      missedWindow: false,
    };

    this.orbitingCubes.push(cube);
  }

  private normalizeAngle(angle: number): number {
    let normalized = angle % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
  }

  /** Attempt to catch a cube with a keycap press */
  catchCube(letter: string): boolean {
    for (const cube of this.orbitingCubes) {
      if (cube.caught) continue;
      if (cube.assignedKeycap !== letter) continue;

      // Check if within catch window
      const catchDiff = Math.abs(this.normalizeAngle(cube.angleDeg - cube.catchAngleDeg));
      if (catchDiff <= this.catchWindowDeg / 2) {
        cube.caught = true;
        this.totalCaught++;

        // Flash effect on keycap
        const mesh = this.keycapMeshes.get(letter);
        if (mesh?.material && 'emissiveColor' in mesh.material) {
          // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
          const mat = mesh.material as any;
          gsap.to(mat.emissiveColor, {
            r: 1,
            g: 1,
            b: 1,
            duration: 0.1,
            yoyo: true,
            repeat: 1,
            ease: 'power2.out',
          });
        }

        // Tension decrease for successful catch
        if (this.scene?.metadata) {
          const tension = this.scene.metadata.currentTension ?? 0;
          this.scene.metadata.currentTension = Math.max(0, tension - 0.03);
        }

        return true;
      }
    }

    return false;
  }

  /** Get orbiting cubes state for rendering */
  getOrbitingCubes(): ReadonlyArray<{
    id: number;
    type: 'crystalline' | 'morph';
    angleDeg: number;
    radius: number;
    altitude: number;
    assignedKeycap: string;
  }> {
    return this.orbitingCubes
      .filter((c) => !c.caught)
      .map((c) => ({
        id: c.id,
        type: c.type,
        angleDeg: c.angleDeg,
        radius: c.orbitRadius,
        altitude: c.altitude,
        assignedKeycap: c.assignedKeycap,
      }));
  }

  /** Get catch statistics */
  getStats(): { caught: number; missed: number } {
    return { caught: this.totalCaught, missed: this.totalMissed };
  }

  dispose(): void {
    // Stop orbital motion / clear cube tracking
    this.orbitingCubes = [];

    // Kill GSAP tweens on keycap meshes (position + material emissive color)
    for (const mesh of this.keycapMeshes.values()) {
      gsap.killTweensOf(mesh.position);
      if (mesh.material) {
        if ('emissiveColor' in mesh.material) {
          // biome-ignore lint/suspicious/noExplicitAny: Material type varies across Babylon.js material classes
          gsap.killTweensOf((mesh.material as any).emissiveColor);
          (mesh.material as any).emissiveColor = { r: 0, g: 0, b: 0 };
        }
      }
    }

    if (this.sphereMesh) gsap.killTweensOf(this.sphereMesh.rotation);

    this.keycapMeshes.clear();
    this.entity = null;
    this.scene = null;
    this.sphereMesh = null;
  }
}

// Self-register
registerHandler('OrbitalCatch', OrbitalCatchHandler);
