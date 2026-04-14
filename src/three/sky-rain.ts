/**
 * Sky rain — atmospheric enemy cubes (InstancedMesh synced to rapier bodies).
 *
 * Spec: research/visuals/11-sps-enemies.md
 *
 * Glowing cubes falling from the sky onto the cabinet. Pure atmospheric —
 * they're the visual reinforcement of the AI's distress as tension rises.
 * InstancedMesh batches all N cubes into a single draw call; rapier owns
 * the simulation (gravity, tumble, impacts against the cabinet floor).
 *
 * At low tension almost nothing falls. At crisis the sky is pouring debris.
 * Occasional red shards appear past tension > 0.5 to communicate critical
 * state (per spec notes).
 */

import RAPIER from '@dimforge/rapier3d';
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
  /** Y height below which particles are considered "landed" and recycled. */
  floorY?: number;
  /** Initial tension 0..1 — seeds how many in-flight particles exist on frame 0. */
  tension?: number;
}

export interface SkyRain {
  mesh: InstancedMesh;
  update(deltaSeconds: number, tension: number): void;
  dispose(): void;
}

interface RainParticle {
  alive: boolean;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  color: Color;
  size: number;
}

const TMP_MATRIX = new Matrix4();
const TMP_SCALE = new Vector3();
const TMP_POS = new Vector3();
const TMP_QUAT = new Quaternion();
const CALM_COLOR = new Color(0.2, 0.8, 1.0);
const CRISIS_COLOR = new Color(1.0, 0.3, 0.25);

/** Hidden below-floor parking spot for dead particles. */
const PARK_Y = -100;

export function createSkyRain(scene: Scene, physics: RAPIER.World, opts: SkyRainOptions = {}): SkyRain {
  const { count = 160, spreadRadius = 3.0, spawnY = 5.0, floorY = 0.4, tension = 0 } = opts;

  const geometry = new BoxGeometry(0.35, 0.35, 0.35);
  const material = new MeshStandardMaterial({
    color: 0x111111,
    emissive: 0xffffff,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.8,
  });

  const mesh = new InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  mesh.count = count;
  scene.add(mesh);

  // Pre-allocate one rapier body per particle. Bodies start in the "parked"
  // state — below the floor, static-like, no gravity. Waking one resets
  // its transform + velocity and enables gravity.
  const particles: RainParticle[] = [];
  for (let i = 0; i < count; i++) {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, PARK_Y, 0)
      .setGravityScale(0)
      .setLinearDamping(0.1)
      .setAngularDamping(0.05)
      .setCanSleep(true);
    const body = physics.createRigidBody(bodyDesc);
    body.sleep(); // start asleep; no physics cost until woken

    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.175, 0.175, 0.175)
      .setRestitution(0.35)
      .setFriction(0.6)
      .setDensity(1.2);
    const collider = physics.createCollider(colliderDesc, body);

    particles.push({
      alive: false,
      body,
      collider,
      color: new Color(0, 0, 0),
      size: 0.35,
    });
    writeInstance(mesh, i, particles[i]);
  }

  function wakeParticle(i: number, curTension: number): void {
    const p = particles[i];
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * spreadRadius;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = spawnY + Math.random() * 0.8;

    const fallSpeed = 2.0 + curTension * 4.5;
    const driftMag = curTension * 0.6;

    p.body.setTranslation({ x, y, z }, true);
    p.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    p.body.setLinvel(
      {
        x: (Math.random() - 0.5) * driftMag,
        y: -fallSpeed,
        z: (Math.random() - 0.5) * driftMag,
      },
      true,
    );
    p.body.setAngvel(
      {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
      },
      true,
    );
    p.body.setGravityScale(1, true);
    p.body.wakeUp();

    p.size = MathUtils.lerp(0.2, 0.5, Math.random());
    // Collider cuboid half-extents are fixed, but we scale the visible mesh
    // for size variance. Keeping the collider uniform is cheap and players
    // won't notice — impact reactions stay consistent.
    const isRed = curTension > 0.5 && Math.random() < 0.15;
    p.color.copy(isRed ? CRISIS_COLOR : CALM_COLOR);
    p.alive = true;
  }

  function parkParticle(i: number): void {
    const p = particles[i];
    p.alive = false;
    p.body.setTranslation({ x: 0, y: PARK_Y, z: 0 }, false);
    p.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
    p.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    p.body.setGravityScale(0, false);
    p.body.sleep();
  }

  function update(deltaSeconds: number, curTension: number): void {
    const t = MathUtils.clamp(curTension, 0, 1);

    // Spawn rate scales with tension — same curve as before the rapier port.
    const expectedSpawns = deltaSeconds * t * 18;
    const spawnThisFrame = Math.random() < expectedSpawns ? Math.ceil(expectedSpawns) : Math.floor(expectedSpawns);
    let spawned = 0;
    for (let i = 0; i < count && spawned < spawnThisFrame; i++) {
      if (!particles[i].alive) {
        wakeParticle(i, t);
        spawned++;
      }
    }

    // Read every live particle's rigid-body transform and push it into the
    // InstancedMesh. Particles that have fallen past the floor get parked.
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      if (!p.alive) continue;
      const pos = p.body.translation();
      if (pos.y < floorY - 0.5) {
        // Past the floor — park for reuse.
        parkParticle(i);
        writeInstance(mesh, i, p);
        continue;
      }
      writeInstance(mesh, i, p);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // Seed some active particles on mount so the first frame has visible rain.
  const initialActive = Math.ceil(count * tension * 0.5);
  for (let i = 0; i < initialActive; i++) {
    wakeParticle(i, tension);
    const pos = particles[i].body.translation();
    const y = MathUtils.lerp(spawnY, floorY + 0.5, Math.random());
    particles[i].body.setTranslation({ x: pos.x, y, z: pos.z }, true);
    writeInstance(mesh, i, particles[i]);
  }
  mesh.instanceMatrix.needsUpdate = true;

  return {
    mesh,
    update,
    dispose() {
      for (const p of particles) {
        physics.removeCollider(p.collider, false);
        physics.removeRigidBody(p.body);
      }
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };

  // ------- helpers -------
  function writeInstance(m: InstancedMesh, i: number, p: RainParticle) {
    if (!p.alive) {
      // Force-hide parked particles off-screen.
      TMP_MATRIX.makeTranslation(0, PARK_Y, 0);
      m.setMatrixAt(i, TMP_MATRIX);
      m.setColorAt(i, new Color(0, 0, 0));
      return;
    }
    const pos = p.body.translation();
    const rot = p.body.rotation();
    TMP_POS.set(pos.x, pos.y, pos.z);
    TMP_QUAT.set(rot.x, rot.y, rot.z, rot.w);
    TMP_SCALE.setScalar(p.size);
    TMP_MATRIX.compose(TMP_POS, TMP_QUAT, TMP_SCALE);
    m.setMatrixAt(i, TMP_MATRIX);
    m.setColorAt(i, p.color);
  }
}
