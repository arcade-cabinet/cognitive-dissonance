/**
 * Shatter VFX — glass shards that spawn when the AI sphere fails.
 *
 * On game-over the AI core's intact glass sphere hides; a pool of small
 * rapier-driven glass cuboids explodes outward with randomized angular
 * velocity. Rain keeps falling, so the shards tumble with the debris —
 * physically unified chaos. On restart, the pool is parked and the
 * sphere returns.
 *
 * Pool size is fixed: 48 shards. We reuse bodies every restart so the
 * rapier world doesn't grow unbounded across game-over cycles.
 */

import RAPIER from '@dimforge/rapier3d';
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshPhysicalMaterial,
  Quaternion,
  type Scene,
  Vector3,
} from 'three';

export interface ShatterOptions {
  /** Center of the implosion — defaults to the AI core position. */
  origin?: Vector3;
  /** How many shards to spawn. */
  count?: number;
  /** Average outward burst velocity. */
  burstSpeed?: number;
}

export interface Shatter {
  mesh: InstancedMesh;
  /** Detonate the pool — wake every shard with outward velocity. */
  explode(): void;
  /** Park every shard off-screen — call on restart. */
  reset(): void;
  /** Per-frame transform sync; no-op when not exploded. */
  update(): void;
  dispose(): void;
}

const TMP_MATRIX = new Matrix4();
const TMP_POS = new Vector3();
const TMP_QUAT = new Quaternion();
const TMP_SCALE = new Vector3();
const PARK_Y = -100;
const SHARD_COLOR = new Color(0.35, 0.6, 1.0); // cold glass-blue
const HIDDEN_COLOR = new Color(0, 0, 0);
// Park matrix for hidden shards — composed once, reused across reset() calls.
const PARK_MATRIX = new Matrix4().makeTranslation(0, PARK_Y, 0);

export function createShatter(scene: Scene, physics: RAPIER.World, opts: ShatterOptions = {}): Shatter {
  const { origin = new Vector3(0, 0.4, 0), count = 48, burstSpeed = 5.5 } = opts;

  // Unit cube — per-shard `size` is applied via TMP_SCALE so visual matches collider.
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshPhysicalMaterial({
    color: 0xaaccff,
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.6,
    thickness: 0.05,
    emissive: 0x112244,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.9,
  });

  const mesh = new InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  mesh.count = count;
  scene.add(mesh);

  interface Shard {
    body: RAPIER.RigidBody;
    collider: RAPIER.Collider;
    color: Color;
    size: number;
  }

  const shards: Shard[] = [];
  for (let i = 0; i < count; i++) {
    // Pre-pick shard size so the collider half-extent matches the rendered scale.
    const size = MathUtils.lerp(0.05, 0.12, Math.random());
    const half = size * 0.5;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, PARK_Y, 0)
      .setGravityScale(0)
      .setLinearDamping(0.05)
      .setAngularDamping(0.05)
      .setCanSleep(true);
    const body = physics.createRigidBody(bodyDesc);
    body.sleep();
    const colliderDesc = RAPIER.ColliderDesc.cuboid(half, half, half)
      .setRestitution(0.5)
      .setFriction(0.4)
      .setDensity(0.3); // glass is light
    const collider = physics.createCollider(colliderDesc, body);
    shards.push({ body, collider, color: SHARD_COLOR.clone(), size });
  }

  let exploded = false;

  function writeMatrix(i: number): void {
    const s = shards[i];
    const pos = s.body.translation();
    const rot = s.body.rotation();
    TMP_POS.set(pos.x, pos.y, pos.z);
    TMP_QUAT.set(rot.x, rot.y, rot.z, rot.w);
    TMP_SCALE.setScalar(s.size);
    TMP_MATRIX.compose(TMP_POS, TMP_QUAT, TMP_SCALE);
    mesh.setMatrixAt(i, TMP_MATRIX);
  }

  function parkInstance(i: number): void {
    mesh.setMatrixAt(i, PARK_MATRIX);
    mesh.setColorAt(i, HIDDEN_COLOR);
  }

  function explode(): void {
    if (exploded) return;
    exploded = true;
    for (let i = 0; i < count; i++) {
      const s = shards[i];
      // Random position inside the sphere's volume.
      const phi = Math.random() * Math.PI * 2;
      const cosTheta = Math.random() * 2 - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      const r = 0.15 + Math.random() * 0.35;
      const x = origin.x + sinTheta * Math.cos(phi) * r;
      const y = origin.y + cosTheta * r;
      const z = origin.z + sinTheta * Math.sin(phi) * r;
      s.body.setTranslation({ x, y, z }, true);
      s.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      // Outward burst from the sphere center + small upward bias.
      const speed = burstSpeed * (0.7 + Math.random() * 0.6);
      s.body.setLinvel(
        {
          x: sinTheta * Math.cos(phi) * speed,
          y: cosTheta * speed + 1.2,
          z: sinTheta * Math.sin(phi) * speed,
        },
        true,
      );
      s.body.setAngvel(
        {
          x: (Math.random() - 0.5) * 12,
          y: (Math.random() - 0.5) * 12,
          z: (Math.random() - 0.5) * 12,
        },
        true,
      );
      s.body.setGravityScale(1, true);
      s.body.wakeUp();
      mesh.setColorAt(i, s.color);
      writeMatrix(i);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function reset(): void {
    exploded = false;
    for (let i = 0; i < count; i++) {
      const s = shards[i];
      s.body.setTranslation({ x: 0, y: PARK_Y, z: 0 }, false);
      s.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
      s.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
      s.body.setGravityScale(0, false);
      s.body.sleep();
      parkInstance(i);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // Park all instances immediately so initial frames don't render uninitialized
  // matrices as spurious unit cubes at the origin.
  reset();

  function update(): void {
    if (!exploded) return;
    // Colors are static after explode(); only rewrite matrices.
    for (let i = 0; i < count; i++) {
      writeMatrix(i);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function dispose(): void {
    for (const s of shards) {
      physics.removeCollider(s.collider, false);
      physics.removeRigidBody(s.body);
    }
    scene.remove(mesh);
    geometry.dispose();
    material.dispose();
    mesh.dispose();
  }

  return {
    mesh,
    explode,
    reset,
    update,
    dispose,
  };
}
