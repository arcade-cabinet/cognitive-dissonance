import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';

// ---------------------------------------------------------------------------
// Math helpers — ported from Grok Procedural Robot Bust Modeling Breakdown
// ---------------------------------------------------------------------------

/** Gauss falloff: bell curve centered at c with standard deviation s */
export function gauss(x: number, c: number, s: number): number {
  return Math.exp(-((x - c) ** 2) / (2 * s * s));
}

/** Hermite smoothstep between a and b */
export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Linear interpolation between a and b by factor t */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Mulberry32 PRNG (same algorithm as seed-helpers.ts, inlined to avoid
// circular dependency in the geometry utilities)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    // biome-ignore lint/suspicious/noAssignInExpressions: standard mulberry32
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Core sculpting utility
// ---------------------------------------------------------------------------

/**
 * Sculpt mesh vertices in-place using a callback.
 *
 * The callback receives the mutable Vector3 `v` plus the original coordinates
 * `ox`, `oy`, `oz` captured before the callback runs. This mirrors the
 * `sculptGeo` pattern from the Grok procedural robot bust.
 */
export function sculptMesh(
  mesh: Mesh,
  fn: (v: Vector3, ox: number, oy: number, oz: number) => void,
): void {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) return;

  const v = new Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    v.set(positions[i], positions[i + 1], positions[i + 2]);
    const ox = v.x;
    const oy = v.y;
    const oz = v.z;
    fn(v, ox, oy, oz);
    positions[i] = v.x;
    positions[i + 1] = v.y;
    positions[i + 2] = v.z;
  }

  mesh.setVerticesData(VertexBuffer.PositionKind, positions);
  mesh.createNormals(true);
}

// ---------------------------------------------------------------------------
// Geometry factories
// ---------------------------------------------------------------------------

/**
 * Create a beveled box with chamfered edges.
 *
 * Starts with a standard box, then uses sculptMesh to push corner and edge
 * vertices inward by `bevel` amount with smoothstep falloff so that the
 * transition from flat face to chamfer is smooth.
 */
export function createBeveledBox(
  name: string,
  opts: { width: number; height: number; depth: number; bevel: number },
  scene: Scene,
): Mesh {
  const { width, height, depth, bevel } = opts;

  // Use subdivisions so there are enough vertices to sculpt smooth bevels
  const mesh = MeshBuilder.CreateBox(
    name,
    { width, height, depth, updatable: true },
    scene,
  );

  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;

  if (bevel > 0) {
    sculptMesh(mesh, (v) => {
      // Distance from each face edge (0 = on face, 1 = at center)
      const dx = Math.abs(v.x) / hw; // 0..1, 1 = at face
      const dy = Math.abs(v.y) / hh;
      const dz = Math.abs(v.z) / hd;

      // Count how many axes are at the edge (value close to 1)
      const edgeThreshold = 1.0 - bevel / Math.min(hw, hh, hd);
      const xEdge = smoothstep(edgeThreshold, 1.0, dx);
      const yEdge = smoothstep(edgeThreshold, 1.0, dy);
      const zEdge = smoothstep(edgeThreshold, 1.0, dz);

      // Combine edge factors — vertices near two or more edges get chamfered
      const edgeFactor = Math.max(xEdge * yEdge, yEdge * zEdge, xEdge * zEdge);

      // Pull the vertex inward toward the center proportionally to edge factor
      const pullStrength = bevel * edgeFactor;
      v.x -= Math.sign(v.x) * pullStrength;
      v.y -= Math.sign(v.y) * pullStrength;
      v.z -= Math.sign(v.z) * pullStrength;
    });
  }

  return mesh;
}

/**
 * Create a faceted polyhedron with sine displacement for crystalline appearance.
 *
 * Starts with a dodecahedron (polyhedron type 1), applies sine displacement
 * to each vertex, and computes flat (faceted) normals — NOT smooth normals.
 */
export function createCrystallinePolyhedron(
  name: string,
  opts: { size: number; displacementScale: number },
  scene: Scene,
): Mesh {
  const { size, displacementScale } = opts;

  const mesh = MeshBuilder.CreatePolyhedron(
    name,
    { type: 1, size, updatable: true, flat: true },
    scene,
  );

  sculptMesh(mesh, (v, ox, oy, oz) => {
    // Use sine of the combined position components for organic crystal displacement
    const displacement =
      Math.sin(ox * 7.0) * Math.sin(oy * 11.0) * Math.sin(oz * 13.0) *
      displacementScale;

    // Displace along the vertex's radial direction
    const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (len > 0) {
      v.x += (ox / len) * displacement;
      v.y += (oy / len) * displacement;
      v.z += (oz / len) * displacement;
    }
  });

  // Recompute normals as flat (faceted) by passing false to createNormals.
  // sculptMesh already called createNormals(true) for smooth normals, but
  // we want faceted appearance, so recompute with flat flag.
  mesh.createNormals(false);

  return mesh;
}

/**
 * Create a sinuous tube with tapering radius.
 *
 * Builds a path with sinusoidal offsets and uses MeshBuilder.CreateTube
 * with a radiusFunction for taper from baseRadius at the start to near-zero
 * at the end.
 */
export function createSinuousTube(
  name: string,
  opts: {
    length: number;
    baseRadius: number;
    segments: number;
    amplitude: number;
    frequency: number;
  },
  scene: Scene,
): Mesh {
  const { length, baseRadius, segments, amplitude, frequency } = opts;

  // Build path with sinusoidal offsets
  const path: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = t * length;
    const x = Math.sin(t * frequency * Math.PI * 2) * amplitude;
    const z = Math.cos(t * frequency * Math.PI * 2) * amplitude * 0.5;
    path.push(new Vector3(x, y, z));
  }

  // Radius function: taper from baseRadius at start to 10% at end
  const radiusFunction = (_i: number, _distance: number): number => {
    const t = _i / segments;
    return lerp(baseRadius, baseRadius * 0.1, t);
  };

  const mesh = MeshBuilder.CreateTube(
    name,
    { path, radiusFunction, tessellation: 12, cap: 2, updatable: true },
    scene,
  );

  return mesh;
}

/**
 * Create an irregular shard from an icosphere with random vertex displacement.
 *
 * Uses mulberry32 PRNG seeded by the `seed` parameter for deterministic but
 * unique geometry per seed value.
 */
export function createIrregularShard(
  name: string,
  opts: { radius: number; seed: number },
  scene: Scene,
): Mesh {
  const { radius, seed } = opts;
  const rng = mulberry32(seed);

  const mesh = MeshBuilder.CreateIcoSphere(
    name,
    { radius, subdivisions: 2, updatable: true },
    scene,
  );

  sculptMesh(mesh, (v, ox, oy, oz) => {
    // Random displacement along the radial direction
    const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (len > 0) {
      const displace = (rng() - 0.5) * radius * 0.6;
      v.x += (ox / len) * displace;
      v.y += (oy / len) * displace;
      v.z += (oz / len) * displace;
    }
  });

  return mesh;
}

/**
 * Create sculpted keycap geometry with dish, bevel, and internal glow channel.
 *
 * - Concave dish on top face using gauss function
 * - Beveled edges using smoothstep distance from edge
 * - Internal hollow for glow channel (bottom face pushed up)
 */
export function createSculptedKeycap(
  name: string,
  opts: {
    width: number;
    height: number;
    depth: number;
    dishDepth: number;
    bevelSize: number;
  },
  scene: Scene,
): Mesh {
  const { width, height, depth, dishDepth, bevelSize } = opts;

  const mesh = MeshBuilder.CreateBox(
    name,
    { width, height, depth, updatable: true },
    scene,
  );

  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;

  sculptMesh(mesh, (v, ox, oy, oz) => {
    // --- Dish on top face ---
    // Top face vertices have oy close to +hh
    if (oy > hh * 0.9) {
      // Concave dish: depress center of top face using gauss falloff from center
      const dishX = gauss(ox, 0, hw * 0.7);
      const dishZ = gauss(oz, 0, hd * 0.7);
      v.y -= dishDepth * dishX * dishZ;
    }

    // --- Edge bevel ---
    if (bevelSize > 0) {
      // Distance from edge as fraction
      const edgeDistX = 1.0 - Math.abs(ox) / hw;
      const edgeDistY = 1.0 - Math.abs(oy) / hh;
      const edgeDistZ = 1.0 - Math.abs(oz) / hd;

      const bevelNorm = bevelSize / Math.min(hw, hh, hd);
      const bevelX = 1.0 - smoothstep(0, bevelNorm, edgeDistX);
      const bevelY = 1.0 - smoothstep(0, bevelNorm, edgeDistY);
      const bevelZ = 1.0 - smoothstep(0, bevelNorm, edgeDistZ);

      const bevelFactor = Math.max(bevelX * bevelY, bevelY * bevelZ, bevelX * bevelZ);
      const pullAmount = bevelSize * bevelFactor;
      v.x -= Math.sign(v.x) * pullAmount * 0.5;
      v.y -= Math.sign(v.y) * pullAmount * 0.5;
      v.z -= Math.sign(v.z) * pullAmount * 0.5;
    }

    // --- Glow channel (internal hollow) ---
    // Push bottom face vertices upward to create a cavity
    if (oy < -hh * 0.9) {
      const hollowX = gauss(ox, 0, hw * 0.5);
      const hollowZ = gauss(oz, 0, hd * 0.5);
      v.y += height * 0.3 * hollowX * hollowZ;
    }
  });

  return mesh;
}

/**
 * Create mechanical lever with tapered shaft, ball joint, and grip handle.
 *
 * - Tapered cylinder for the shaft
 * - Sphere for ball joint at the base
 * - Sculpted grip with ergonomic curve at the top
 */
export function createMechanicalLever(
  name: string,
  opts: { shaftLength: number; gripRadius: number },
  scene: Scene,
): Mesh {
  const { shaftLength, gripRadius } = opts;

  // --- Shaft: tapered cylinder ---
  const shaft = MeshBuilder.CreateCylinder(
    `${name}_shaft`,
    {
      height: shaftLength,
      diameterTop: gripRadius * 0.6,
      diameterBottom: gripRadius * 1.2,
      tessellation: 16,
      updatable: true,
    },
    scene,
  );

  // Apply a subtle ergonomic S-curve to the shaft
  sculptMesh(shaft, (v, _ox, oy) => {
    const t = (oy + shaftLength / 2) / shaftLength; // 0 at bottom, 1 at top
    // S-curve offset in x
    v.x += Math.sin(t * Math.PI) * gripRadius * 0.15;
  });

  // --- Ball joint at base ---
  const ball = MeshBuilder.CreateSphere(
    `${name}_ball`,
    { diameter: gripRadius * 1.4, segments: 12, updatable: true },
    scene,
  );

  // Position ball at bottom of shaft
  sculptMesh(ball, (v) => {
    v.y -= shaftLength / 2;
  });

  // --- Grip handle at top ---
  const grip = MeshBuilder.CreateCylinder(
    `${name}_grip`,
    {
      height: gripRadius * 2,
      diameter: gripRadius * 1.8,
      tessellation: 16,
      updatable: true,
    },
    scene,
  );

  // Position grip at top of shaft and sculpt ergonomic shape
  sculptMesh(grip, (v, _ox, oy) => {
    // Move to top of shaft
    v.y += shaftLength / 2 + gripRadius;

    // Ergonomic curve: narrow in middle, wider at top and bottom
    const localY = oy / gripRadius; // -1..1
    const ergonomicScale = 1.0 - gauss(localY, 0, 0.5) * 0.25;
    v.x *= ergonomicScale;
    v.z *= ergonomicScale;
  });

  // Merge: use the shaft as the primary mesh and merge ball + grip into it
  // In Babylon.js, we merge by combining vertex data
  const merged = MeshBuilder.CreateCylinder(
    name,
    {
      height: shaftLength + gripRadius * 2 + gripRadius * 1.4,
      diameterTop: gripRadius * 1.8,
      diameterBottom: gripRadius * 1.4,
      tessellation: 16,
      updatable: true,
    },
    scene,
  );

  const totalHeight = shaftLength + gripRadius * 2 + gripRadius * 1.4;
  const halfTotal = totalHeight / 2;

  sculptMesh(merged, (v, _ox, oy) => {
    // Normalize oy to 0..1 along full length (bottom = ball, top = grip)
    const t = (oy + halfTotal) / totalHeight; // 0 at bottom, 1 at top

    // Ball joint region (bottom ~20%)
    const ballRegionEnd = (gripRadius * 1.4) / totalHeight;
    if (t < ballRegionEnd) {
      // Spherical bulge for ball joint
      const bt = t / ballRegionEnd; // 0..1 within ball region
      const sphereInfluence = Math.sin(bt * Math.PI);
      const ballRadius = gripRadius * 0.7;
      v.x *= lerp(1.0, 1.0 + sphereInfluence * 0.4, smoothstep(0, ballRegionEnd, t));
      v.z *= lerp(1.0, 1.0 + sphereInfluence * 0.4, smoothstep(0, ballRegionEnd, t));
    }

    // Shaft region (middle ~60%) — taper
    const shaftStart = ballRegionEnd;
    const shaftEnd = shaftStart + shaftLength / totalHeight;
    if (t >= shaftStart && t <= shaftEnd) {
      const st = (t - shaftStart) / (shaftEnd - shaftStart); // 0..1 within shaft
      // Taper: wider at bottom, narrower at top
      const taperScale = lerp(1.0, 0.6, st);
      v.x *= taperScale;
      v.z *= taperScale;
      // S-curve
      v.x += Math.sin(st * Math.PI) * gripRadius * 0.15;
    }

    // Grip region (top ~20%) — ergonomic shape
    if (t > shaftEnd) {
      const gt = (t - shaftEnd) / (1.0 - shaftEnd); // 0..1 within grip
      // Wider at top and bottom of grip, narrower in middle
      const ergonomic = 1.0 - gauss(gt, 0.5, 0.3) * 0.25;
      v.x *= ergonomic * 1.2;
      v.z *= ergonomic * 1.2;
    }
  });

  // Clean up intermediate meshes
  shaft.dispose();
  ball.dispose();
  grip.dispose();

  return merged;
}
