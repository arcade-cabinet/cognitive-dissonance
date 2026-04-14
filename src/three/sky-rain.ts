/**
 * Sky rain — atmospheric enemy cubes (Three.js InstancedMesh).
 *
 * Spec: research/visuals/11-sps-enemies.md
 *
 * Glowing cubes falling from the sky onto the cabinet. Pure atmospheric —
 * they're the visual reinforcement of the AI's distress as tension rises.
 * InstancedMesh batches all N cubes into a single draw call, same as
 * Babylon's SolidParticleSystem.
 *
 * At low tension almost nothing falls. At crisis the sky is pouring debris.
 * Occasional red shards appear past tension > 0.5 to communicate critical
 * state (per spec notes).
 */

import {
  BoxGeometry,
  Color,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  type Scene,
  Vector3,
} from 'three';

export interface SkyRainOptions {
  count?: number;
  /** X/Z radius the spawn points scatter across. */
  spreadRadius?: number;
  /** Y height particles spawn at (they fall from here). */
  spawnY?: number;
  /** Y height particles are considered "landed" and recycled. */
  floorY?: number;
  /** Initial tension 0..1. */
  tension?: number;
}

export interface SkyRain {
  mesh: InstancedMesh;
  /**
   * Drive simulation one frame.
   * @param deltaSeconds frame time
   * @param tension 0..1 — faster falls + more spawns at higher values
   */
  update(deltaSeconds: number, tension: number): void;
  dispose(): void;
}

interface Particle {
  alive: boolean;
  position: Vector3;
  velocity: Vector3;
  rotation: Quaternion;
  angularVel: Vector3;
  color: Color;
  size: number;
}

const TMP_MATRIX = new Matrix4();
const TMP_SCALE = new Vector3();
const CALM_COLOR = new Color(0.2, 0.8, 1.0); // cyan
const CRISIS_COLOR = new Color(1.0, 0.3, 0.25); // red shard

export function createSkyRain(scene: Scene, opts: SkyRainOptions = {}): SkyRain {
  const { count = 160, spreadRadius = 3.0, spawnY = 5.0, floorY = 0.4, tension = 0 } = opts;

  const geometry = new BoxGeometry(0.35, 0.35, 0.35);
  const material = new MeshStandardMaterial({
    color: 0x111111,
    emissive: 0xffffff, // per-instance color overrides this via setColorAt
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.8,
  });

  const mesh = new InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  mesh.count = count;
  scene.add(mesh);

  // Initialize all particles dead + parked below the floor
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      alive: false,
      position: new Vector3(0, -100, 0),
      velocity: new Vector3(0, 0, 0),
      rotation: new Quaternion(),
      angularVel: new Vector3(0, 0, 0),
      color: new Color(0, 0, 0),
      size: 0.35,
    });
    writeInstance(mesh, i, particles[i]);
  }

  function wakeParticle(i: number, curTension: number): void {
    const p = particles[i];
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * spreadRadius;
    p.position.set(Math.cos(angle) * r, spawnY + Math.random() * 0.8, Math.sin(angle) * r);
    const fallSpeed = 2.0 + curTension * 4.5;
    // Slight horizontal drift — stronger at high tension = turbulence
    const driftMag = curTension * 0.6;
    p.velocity.set((Math.random() - 0.5) * driftMag, -fallSpeed, (Math.random() - 0.5) * driftMag);
    p.angularVel.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
    p.rotation.set(0, 0, 0, 1);
    p.size = MathUtils.lerp(0.2, 0.5, Math.random());
    // Mostly cyan; past half-tension, ~15% chance of a red shard
    const isRed = curTension > 0.5 && Math.random() < 0.15;
    p.color.copy(isRed ? CRISIS_COLOR : CALM_COLOR);
    p.alive = true;
  }

  function update(deltaSeconds: number, curTension: number): void {
    const t = MathUtils.clamp(curTension, 0, 1);

    // Spawn rate scales with tension. Expected spawns per frame at 60fps:
    //   t=0.0 → 0/s, t=0.5 → 9/s, t=1.0 → 18/s
    const expectedSpawns = deltaSeconds * t * 18;
    const spawnThisFrame = Math.random() < expectedSpawns ? Math.ceil(expectedSpawns) : Math.floor(expectedSpawns);
    let spawned = 0;
    for (let i = 0; i < count && spawned < spawnThisFrame; i++) {
      if (!particles[i].alive) {
        wakeParticle(i, t);
        spawned++;
      }
    }

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      if (!p.alive) continue;
      p.position.addScaledVector(p.velocity, deltaSeconds);
      // Integrate rotation. Skip when the angular-velocity vector is
      // (effectively) zero — normalize() of a zero vector returns NaN and
      // corrupts the quaternion downstream.
      const angSpeed = p.angularVel.length();
      if (angSpeed > 1e-6) {
        const axis = new Vector3(p.angularVel.x, p.angularVel.y, p.angularVel.z).multiplyScalar(1 / angSpeed);
        const q = new Quaternion().setFromAxisAngle(axis, angSpeed * deltaSeconds);
        p.rotation.premultiply(q);
      }

      if (p.position.y < floorY) {
        p.alive = false;
        p.position.set(0, -100, 0);
      }
      writeInstance(mesh, i, p);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // Seed a few active particles so the very first frame has visible rain
  // (useful for static screenshot tests).
  const initialActive = Math.ceil(count * tension * 0.5);
  for (let i = 0; i < initialActive; i++) {
    wakeParticle(i, tension);
    // Disperse them across the fall column so they're not all at the top.
    particles[i].position.y = MathUtils.lerp(spawnY, floorY + 0.5, Math.random());
    writeInstance(mesh, i, particles[i]);
  }
  mesh.instanceMatrix.needsUpdate = true;

  return {
    mesh,
    update,
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };

  // ------- helpers -------
  function writeInstance(m: InstancedMesh, i: number, p: Particle) {
    TMP_SCALE.setScalar(p.size);
    TMP_MATRIX.compose(p.position, p.rotation, TMP_SCALE);
    m.setMatrixAt(i, TMP_MATRIX);
    m.setColorAt(i, p.alive ? p.color : new Color(0, 0, 0));
  }
}
