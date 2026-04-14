/**
 * Emergent controls — the *cabinet engine* input system.
 *
 * Spec: research/visuals/09-keycaps.md
 *
 * Cognitive Dissonance is a cabinet engine, not a fixed game: the platter
 * chassis is constant, but each level declares an *input schema* — a list of
 * control types it needs — and the cabinet materialises those controls by
 * extruding them up through machined slits in the platter rim.
 *
 * This module renders a level's input schema. It doesn't know or care about
 * game logic; it just takes a schema and gives you emerged meshes + an
 * `emerge()` animation hook. Whether the level is pattern-matching, push-pull,
 * sequence-memory, or a hybrid — this renders all of them.
 *
 * Control shapes supported:
 *   - `keycap`    — square emissive button (pattern-match, sequence)
 *   - `handle`    — tall paired push/pull grip (opposite-direction pairs)
 *   - `slider`    — horizontal lever (rhythm, precision)
 *
 * The shape vocabulary is extensible — add new ControlKinds as new game modes
 * are designed.
 */

import {
  BoxGeometry,
  type Color,
  CylinderGeometry,
  type Group,
  MathUtils,
  type Mesh,
  MeshStandardMaterial,
  type Scene,
  Vector3,
} from 'three';
import * as THREE from 'three';

export type ControlKind = 'keycap' | 'handle' | 'slider';

export interface ControlSpec {
  kind: ControlKind;
  /** Hex color for the emissive face — pattern palette, pair ids, etc. */
  color: string;
  /** Optional label shown on the cap face (rendered as canvas texture). */
  label?: string;
  /** For paired controls (handles), group id — opposing handles share one. */
  pairId?: string;
}

export interface EmergentControlsOptions {
  schema: ControlSpec[];
  /** Platter rim radius — controls sit along this circle. */
  rimRadius?: number;
  /** Y position of the rim surface (slits open here). */
  rimY?: number;
  /** Angular span in radians the controls fan across (default: full circle). */
  arcRadians?: number;
  /** Start angle for the arc. */
  arcStart?: number;
}

export interface EmergedControl {
  spec: ControlSpec;
  /** Visible control mesh (top of the slit). */
  mesh: Mesh;
  /** Recessed housing (below slit — always hidden but exists for shadow). */
  housing: Mesh;
  material: MeshStandardMaterial;
  /** Current raised height 0 (flush/hidden) → 1 (fully emerged). */
  emerged: number;
  /** Angular position on the rim. */
  angle: number;
}

export interface EmergentControls {
  group: Group;
  controls: EmergedControl[];
  /**
   * Animate all controls from fully-recessed → fully-emerged over `seconds`,
   * staggering each so they emerge sequentially around the rim.
   * Returns a simple frame-update callback — call it from the render loop
   * with elapsed seconds and it'll drive the animation, resolving to all-up.
   */
  emerge(durationSeconds?: number, stagger?: number): (elapsed: number) => boolean;
  /** Set one control's pressed state (0 = released, 1 = fully pressed). */
  setPressed(index: number, pressed: number): void;
  dispose(): void;
}

const HOUSING_DEPTH = 0.18; // how far below rim the control hides
const CONTROL_TRAVEL = 0.08; // physical press travel when user pushes

function makeControlMesh(
  spec: ControlSpec,
  scene: Scene,
): { mesh: Mesh; housing: Mesh; material: MeshStandardMaterial } {
  const emissive = new THREE.Color(spec.color);
  const albedo = emissive.clone().multiplyScalar(0.3).addScalar(0.08);

  const material = new MeshStandardMaterial({
    color: albedo,
    metalness: 0.4,
    roughness: 0.45,
    emissive,
    emissiveIntensity: 0.7,
  });

  let geometry: THREE.BufferGeometry;
  switch (spec.kind) {
    case 'keycap':
      geometry = new BoxGeometry(0.12, 0.08, 0.12);
      break;
    case 'handle':
      // Tall cylindrical grip, about 3× keycap height
      geometry = new CylinderGeometry(0.05, 0.06, 0.26, 16);
      break;
    case 'slider':
      // Wide, short rectangular lever
      geometry = new BoxGeometry(0.22, 0.05, 0.1);
      break;
  }

  const mesh = new THREE.Mesh(geometry, material);

  // Housing: a small dark box underneath for shadow / recess depth.
  const housingMat = new MeshStandardMaterial({
    color: 0x050508,
    metalness: 0.3,
    roughness: 0.9,
  });
  const housing = new THREE.Mesh(new BoxGeometry(0.14, HOUSING_DEPTH * 2, 0.14), housingMat);
  housing.position.y = -HOUSING_DEPTH;

  scene.add(mesh); // mesh is later parented into the rim group
  return { mesh, housing, material };
}

export function createEmergentControls(
  scene: Scene,
  opts: EmergentControlsOptions,
): EmergentControls {
  const {
    schema,
    rimRadius = 1.45,
    rimY = 0.2,
    arcRadians = Math.PI * 2,
    arcStart = 0,
  } = opts;

  const group = new THREE.Group();
  group.position.y = rimY;
  scene.add(group);

  const controls: EmergedControl[] = [];
  const n = schema.length;

  for (let i = 0; i < n; i++) {
    const spec = schema[i];
    // Even angular distribution across the requested arc.
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angle = arcStart + t * arcRadians;
    const { mesh, housing, material } = makeControlMesh(spec, scene);

    // Place on rim circle; start fully recessed (y = -HOUSING_DEPTH).
    const xz = new Vector3(Math.cos(angle) * rimRadius, 0, Math.sin(angle) * rimRadius);
    mesh.position.set(xz.x, -HOUSING_DEPTH, xz.z);
    housing.position.set(xz.x, -HOUSING_DEPTH, xz.z);

    // Face the centre — handles especially need correct orientation.
    mesh.lookAt(0, mesh.position.y, 0);
    housing.lookAt(0, housing.position.y, 0);

    // Re-parent into the group so we can dispose cleanly.
    group.add(mesh);
    group.add(housing);

    controls.push({ spec, mesh, housing, material, emerged: 0, angle });
  }

  function emerge(durationSeconds = 1.6, stagger = 0.12): (elapsed: number) => boolean {
    return (elapsed: number) => {
      let allDone = true;
      for (let i = 0; i < controls.length; i++) {
        const ctrl = controls[i];
        const start = i * stagger;
        const localT = MathUtils.clamp((elapsed - start) / durationSeconds, 0, 1);
        // Heavy mechanical ease — slow start, strong middle, settle
        const eased = localT < 0.5 ? 2 * localT * localT : 1 - (-2 * localT + 2) ** 2 / 2;
        ctrl.emerged = eased;
        const yOffset = -HOUSING_DEPTH + eased * HOUSING_DEPTH;
        ctrl.mesh.position.y = yOffset;
        if (localT < 1) allDone = false;
      }
      return allDone;
    };
  }

  function setPressed(index: number, pressed: number): void {
    const ctrl = controls[index];
    if (!ctrl) return;
    const clamped = MathUtils.clamp(pressed, 0, 1);
    const baseY = -HOUSING_DEPTH + ctrl.emerged * HOUSING_DEPTH;
    ctrl.mesh.position.y = baseY - clamped * CONTROL_TRAVEL;
    ctrl.material.emissiveIntensity = 0.7 + clamped * 0.6;
  }

  return {
    group,
    controls,
    emerge,
    setPressed,
    dispose() {
      scene.remove(group);
      for (const c of controls) {
        (c.mesh.geometry as THREE.BufferGeometry).dispose();
        c.material.dispose();
        (c.housing.geometry as THREE.BufferGeometry).dispose();
        (c.housing.material as THREE.Material).dispose();
      }
    },
  };
}

/* --------------------------------------------------------------------------
 * Example schemas — these live here for docs/testing. Real levels would build
 * their own schemas from level config.
 * ------------------------------------------------------------------------ */

export const PATTERN_12: ControlSpec[] = [
  '#f87171',
  '#fbbf24',
  '#facc15',
  '#a3e635',
  '#34d399',
  '#22d3ee',
  '#60a5fa',
  '#818cf8',
  '#c084fc',
  '#f472b6',
  '#fb7185',
  '#fcd34d',
].map((color) => ({ kind: 'keycap', color }) as ControlSpec);

export const PUSH_PULL_PAIR: ControlSpec[] = [
  { kind: 'handle', color: '#22d3ee', label: 'PUSH', pairId: 'A' },
  { kind: 'handle', color: '#f87171', label: 'PULL', pairId: 'A' },
];

export const SEQUENCE_6: ControlSpec[] = ['1', '2', '3', '4', '5', '6'].map(
  (label) => ({ kind: 'keycap', color: '#7dd3fc', label }) as ControlSpec,
);

export const MIXED_HYBRID: ControlSpec[] = [
  { kind: 'handle', color: '#22d3ee', label: 'PUSH', pairId: 'A' },
  { kind: 'keycap', color: '#f87171' },
  { kind: 'keycap', color: '#fbbf24' },
  { kind: 'keycap', color: '#34d399' },
  { kind: 'keycap', color: '#c084fc' },
  { kind: 'handle', color: '#f87171', label: 'PULL', pairId: 'A' },
];
