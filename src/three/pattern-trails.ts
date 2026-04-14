/**
 * Pattern trails — renders active `Pattern` entities as glowing trails.
 *
 * The stabilizer sim spawns entities and updates their Position every
 * fixed step. This renderer reads the current snapshot each frame and
 * draws every pattern as a small emissive sphere whose color matches
 * the pattern's keycap palette slot.
 *
 * Uses a per-pattern pool of mesh instances so we never allocate during
 * the render loop. When a pattern entity disappears, its mesh is parked
 * off-screen and reused for the next spawn.
 */

import type { World } from 'koota';
import { Color, Mesh, MeshBasicMaterial, type Scene, SphereGeometry } from 'three';
import { IsPattern, Pattern, Position } from '@/sim/world';

const MAX_PATTERNS = 32;
const TRAIL_RADIUS = 0.04;

export interface PatternTrails {
  update(): void;
  dispose(): void;
}

export function createPatternTrails(scene: Scene, world: World): PatternTrails {
  const geometry = new SphereGeometry(TRAIL_RADIUS, 10, 10);
  const meshes: Mesh[] = [];

  for (let i = 0; i < MAX_PATTERNS; i++) {
    const material = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    mesh.position.set(0, -100, 0);
    scene.add(mesh);
    meshes.push(mesh);
  }

  const tmpColor = new Color();

  function update(): void {
    let slot = 0;

    world.query(IsPattern, Pattern, Position).updateEach(([pattern, pos]) => {
      if (slot >= MAX_PATTERNS) return;
      const m = meshes[slot++];
      const mat = m.material as MeshBasicMaterial;
      tmpColor.set(pattern.color);
      mat.color.copy(tmpColor);
      // Trail grows hotter as it nears escape.
      const heat = pattern.progress;
      mat.opacity = 0.85 + heat * 0.15;
      m.position.set(pos.x, pos.y, pos.z);
      // Slight scaling with progress for a "growing threat" read.
      const scale = 0.9 + heat * 1.1;
      m.scale.setScalar(scale);
      m.visible = true;
    });

    // Hide unused slots.
    for (let i = slot; i < MAX_PATTERNS; i++) {
      meshes[i].visible = false;
      meshes[i].position.set(0, -100, 0);
    }
  }

  function dispose(): void {
    for (const m of meshes) {
      scene.remove(m);
      (m.material as MeshBasicMaterial).dispose();
    }
    geometry.dispose();
  }

  return { update, dispose };
}
