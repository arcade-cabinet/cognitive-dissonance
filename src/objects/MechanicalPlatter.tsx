import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';

export interface PlatterComponents {
  platter: Mesh;
  track: Mesh;
  slitTop: Mesh;
  slitBottom: Mesh;
  lever: Mesh;
  keycaps: Mesh[];
  sphere: Mesh;
  /** PLAY menu keycap — visible between slit halves on title screen */
  playKeycap: Mesh;
  /** CONTINUE menu keycap — starts hidden below slit, emerged by GameBootstrap */
  continueKeycap: Mesh;
  /** Target rim positions per keycap letter (for MechanicalAnimationSystem emerge/retract) */
  rimPositions: Map<string, { x: number; y: number; z: number }>;
}

/**
 * Sculpt vertex positions in-place via a callback.
 * Iterates all vertices (stride 3) and applies the mutation function.
 */
export function sculptVertices(positions: Float32Array, fn: (v: Vector3) => void): void {
  const v = new Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    v.set(positions[i], positions[i + 1], positions[i + 2]);
    fn(v);
    positions[i] = v.x;
    positions[i + 1] = v.y;
    positions[i + 2] = v.z;
  }
}

/**
 * Create procedural keycap geometry with sculpted concave top, beveled edges,
 * internal glow channel (hollow bottom), and mechanical joint hinges.
 *
 * Dimensions: 0.08 x 0.04 x 0.08 (width x height x depth)
 * Chamfer: 0.002 units on all edges
 *
 * @param name - Mesh name
 * @param scene - Babylon.js scene
 * @returns Procedural keycap Mesh
 */
export function createProceduralKeycap(name: string, scene: Scene): Mesh {
  const w = 0.08; // width
  const h = 0.04; // height
  const d = 0.08; // depth
  const chamfer = 0.002;
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  // Build a subdivided box base for sculpting
  const tempBox = MeshBuilder.CreateBox(`${name}_temp`, {
    width: w,
    height: h,
    depth: d,
    updatable: true,
  }, scene);

  const positions = tempBox.getVerticesData('position');
  const normals = tempBox.getVerticesData('normal');
  const uvs = tempBox.getVerticesData('uv');
  const indices = tempBox.getIndices();
  tempBox.dispose();

  if (!positions || !normals || !uvs || !indices) {
    // Fallback: return a simple box if vertex data unavailable
    return MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  }

  const sculptedPositions = new Float32Array(positions);

  // Pass 1: Concave dish on top surface (vertices where y is near +hh)
  sculptVertices(sculptedPositions, (v) => {
    if (v.y > hh - 0.005) {
      // Sculpt concave dish: depress center of top face, keep edges raised
      const distFromCenter = Math.sqrt((v.x * v.x) + (v.z * v.z));
      const maxDist = Math.sqrt(hw * hw + hd * hd);
      const normalizedDist = Math.min(distFromCenter / maxDist, 1.0);
      // Parabolic dish: center depresses by 0.004, edges stay at original height
      const dishDepth = 0.004 * (1.0 - normalizedDist * normalizedDist);
      v.y -= dishDepth;
    }
  });

  // Pass 2: Bevel/chamfer edges (pull vertices near corners inward)
  sculptVertices(sculptedPositions, (v) => {
    // Chamfer along X edges
    if (Math.abs(v.x) > hw - chamfer) {
      const sign = Math.sign(v.x);
      v.x = sign * (hw - chamfer * 0.5);
    }
    // Chamfer along Y edges
    if (Math.abs(v.y) > hh - chamfer) {
      const sign = Math.sign(v.y);
      v.y = sign * (hh - chamfer * 0.5);
    }
    // Chamfer along Z edges
    if (Math.abs(v.z) > hd - chamfer) {
      const sign = Math.sign(v.z);
      v.z = sign * (hd - chamfer * 0.5);
    }
  });

  // Pass 3: Hollow bottom (internal glow channel) — push bottom vertices upward
  sculptVertices(sculptedPositions, (v) => {
    if (v.y < -hh + 0.005) {
      const distFromCenter = Math.sqrt((v.x * v.x) + (v.z * v.z));
      const maxDist = Math.sqrt(hw * hw + hd * hd);
      const normalizedDist = Math.min(distFromCenter / maxDist, 1.0);
      // Hollow cavity: center rises by 0.008, edges stay at original
      const hollowDepth = 0.008 * (1.0 - normalizedDist * normalizedDist);
      v.y += hollowDepth;
    }
  });

  // Build the keycap mesh from sculpted vertex data
  const keycapMesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = Array.from(sculptedPositions);
  vertexData.normals = Array.from(normals);
  vertexData.uvs = Array.from(uvs);
  vertexData.indices = Array.from(indices);
  vertexData.applyToMesh(keycapMesh, true);

  // Add mechanical joint hinges: tiny cylinder pistons on left/right sides
  const hingeLeft = MeshBuilder.CreateCylinder(`${name}_hingeL`, {
    height: 0.006,
    diameter: 0.003,
    tessellation: 8,
  }, scene);
  hingeLeft.position = new Vector3(-hw - 0.002, 0, 0);
  hingeLeft.rotation.z = Math.PI / 2;
  hingeLeft.parent = keycapMesh;

  const hingeRight = MeshBuilder.CreateCylinder(`${name}_hingeR`, {
    height: 0.006,
    diameter: 0.003,
    tessellation: 8,
  }, scene);
  hingeRight.position = new Vector3(hw + 0.002, 0, 0);
  hingeRight.rotation.z = Math.PI / 2;
  hingeRight.parent = keycapMesh;

  return keycapMesh;
}

/**
 * Create procedural menu keycap (PLAY / CONTINUE) with sculpted geometry.
 * Larger than standard keycaps: 0.14 x 0.05 x 0.14.
 */
export function createProceduralMenuKeycap(name: string, scene: Scene): Mesh {
  const w = 0.14;
  const h = 0.05;
  const d = 0.14;
  const chamfer = 0.003;
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  const tempBox = MeshBuilder.CreateBox(`${name}_temp`, {
    width: w,
    height: h,
    depth: d,
    updatable: true,
  }, scene);

  const positions = tempBox.getVerticesData('position');
  const normals = tempBox.getVerticesData('normal');
  const uvs = tempBox.getVerticesData('uv');
  const indices = tempBox.getIndices();
  tempBox.dispose();

  if (!positions || !normals || !uvs || !indices) {
    return MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  }

  const sculptedPositions = new Float32Array(positions);

  // Concave dish on top
  sculptVertices(sculptedPositions, (v) => {
    if (v.y > hh - 0.006) {
      const distFromCenter = Math.sqrt((v.x * v.x) + (v.z * v.z));
      const maxDist = Math.sqrt(hw * hw + hd * hd);
      const normalizedDist = Math.min(distFromCenter / maxDist, 1.0);
      const dishDepth = 0.005 * (1.0 - normalizedDist * normalizedDist);
      v.y -= dishDepth;
    }
  });

  // Bevel edges
  sculptVertices(sculptedPositions, (v) => {
    if (Math.abs(v.x) > hw - chamfer) {
      v.x = Math.sign(v.x) * (hw - chamfer * 0.5);
    }
    if (Math.abs(v.y) > hh - chamfer) {
      v.y = Math.sign(v.y) * (hh - chamfer * 0.5);
    }
    if (Math.abs(v.z) > hd - chamfer) {
      v.z = Math.sign(v.z) * (hd - chamfer * 0.5);
    }
  });

  // Hollow bottom
  sculptVertices(sculptedPositions, (v) => {
    if (v.y < -hh + 0.006) {
      const distFromCenter = Math.sqrt((v.x * v.x) + (v.z * v.z));
      const maxDist = Math.sqrt(hw * hw + hd * hd);
      const normalizedDist = Math.min(distFromCenter / maxDist, 1.0);
      const hollowDepth = 0.010 * (1.0 - normalizedDist * normalizedDist);
      v.y += hollowDepth;
    }
  });

  const menuKeycap = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = Array.from(sculptedPositions);
  vertexData.normals = Array.from(normals);
  vertexData.uvs = Array.from(uvs);
  vertexData.indices = Array.from(indices);
  vertexData.applyToMesh(menuKeycap, true);

  // Hinges for menu keycaps (slightly larger)
  const hingeLeft = MeshBuilder.CreateCylinder(`${name}_hingeL`, {
    height: 0.008,
    diameter: 0.004,
    tessellation: 8,
  }, scene);
  hingeLeft.position = new Vector3(-hw - 0.003, 0, 0);
  hingeLeft.rotation.z = Math.PI / 2;
  hingeLeft.parent = menuKeycap;

  const hingeRight = MeshBuilder.CreateCylinder(`${name}_hingeR`, {
    height: 0.008,
    diameter: 0.004,
    tessellation: 8,
  }, scene);
  hingeRight.position = new Vector3(hw + 0.003, 0, 0);
  hingeRight.rotation.z = Math.PI / 2;
  hingeRight.parent = menuKeycap;

  return menuKeycap;
}

/**
 * Create procedural lever geometry with tapered shaft, ball joint base,
 * ergonomic grip handle, and resistance groove marks.
 *
 * Replaces: CreateBox lever (0.08 x 0.12 x 0.04)
 *
 * @param name - Mesh name
 * @param scene - Babylon.js scene
 * @returns Procedural lever Mesh
 */
export function createProceduralLever(name: string, scene: Scene): Mesh {
  // Root mesh acts as parent
  const leverRoot = new Mesh(name, scene);

  // Main shaft: tapered cylinder (wider at base, narrower at top)
  const shaft = MeshBuilder.CreateCylinder(`${name}_shaft`, {
    height: 0.10,
    diameterTop: 0.025,
    diameterBottom: 0.035,
    tessellation: 16,
    updatable: true,
  }, scene);

  // Apply resistance groove marks via vertex displacement
  const shaftPositions = shaft.getVerticesData('position');
  if (shaftPositions) {
    const sculptedShaft = new Float32Array(shaftPositions);
    sculptVertices(sculptedShaft, (v) => {
      // Create horizontal groove lines at 4 evenly spaced positions along shaft
      const normalizedY = (v.y + 0.05) / 0.10; // 0..1 along shaft height
      for (let g = 0; g < 4; g++) {
        const groovePos = 0.2 + g * 0.2; // at 20%, 40%, 60%, 80%
        const distToGroove = Math.abs(normalizedY - groovePos);
        if (distToGroove < 0.03) {
          // Indent radially inward by 0.001 for groove effect
          const len = Math.sqrt(v.x * v.x + v.z * v.z);
          if (len > 0) {
            const grooveDepth = 0.001 * (1.0 - distToGroove / 0.03);
            const scale = (len - grooveDepth) / len;
            v.x *= scale;
            v.z *= scale;
          }
        }
      }
    });
    shaft.updateVerticesData('position', Array.from(sculptedShaft));
  }

  shaft.position = new Vector3(0, 0.01, 0); // offset upward slightly (ball joint below)
  shaft.parent = leverRoot;

  // Ball joint at base (sphere)
  const ballJoint = MeshBuilder.CreateSphere(`${name}_ball`, {
    diameter: 0.025,
    segments: 12,
  }, scene);
  ballJoint.position = new Vector3(0, -0.04, 0); // at base of shaft
  ballJoint.parent = leverRoot;

  // Grip handle with ergonomic curve (sculpted cylinder)
  const grip = MeshBuilder.CreateCylinder(`${name}_grip`, {
    height: 0.025,
    diameter: 0.04,
    tessellation: 16,
    updatable: true,
  }, scene);

  // Sculpt ergonomic curve into grip (waist pinch)
  const gripPositions = grip.getVerticesData('position');
  if (gripPositions) {
    const sculptedGrip = new Float32Array(gripPositions);
    sculptVertices(sculptedGrip, (v) => {
      // Ergonomic waist: pinch the center of the grip
      const normalizedY = (v.y + 0.0125) / 0.025; // 0..1
      const waistFactor = 1.0 - 0.15 * Math.sin(normalizedY * Math.PI);
      const len = Math.sqrt(v.x * v.x + v.z * v.z);
      if (len > 0) {
        v.x *= waistFactor;
        v.z *= waistFactor;
      }
    });
    grip.updateVerticesData('position', Array.from(sculptedGrip));
  }

  grip.position = new Vector3(0, 0.065, 0); // at top of shaft
  grip.parent = leverRoot;

  return leverRoot;
}

/**
 * Factory function to create the mechanical platter with all components.
 *
 * Components:
 * - Platter: Heavy industrial cylinder (0.18m x 1.2m) with PBR near-black metal
 * - Track: Recessed torus (0.8m x 0.04m) for sphere constraint
 * - Slit: Garage-door top/bottom boxes (0.9m wide)
 * - Lever: Procedural tapered shaft with ball joint, ergonomic grip, and groove marks
 * - Keycaps: 14 procedural sculpted keycaps on rim (concave dish, beveled, hinged)
 * - Sphere: 52cm glass sphere with PBR material
 *
 * @param scene - Babylon.js scene
 * @returns PlatterComponents object with all mesh references
 */
export function createMechanicalPlatter(scene: Scene): PlatterComponents {
  // Platter cylinder (0.18m height, 1.2m diameter)
  const platter = MeshBuilder.CreateCylinder(
    'platter',
    {
      height: 0.18,
      diameter: 1.2,
      tessellation: 64,
    },
    scene,
  );
  platter.position = new Vector3(0, 0, 0);

  // PBR near-black metal material
  const platterMaterial = new PBRMaterial('platterMaterial', scene);
  platterMaterial.metallic = 0.9;
  platterMaterial.roughness = 0.4;
  platterMaterial.albedoColor = new Color3(0.05, 0.05, 0.05); // near-black
  platter.material = platterMaterial;

  // Recessed torus track (0.8m diameter, 0.04m thickness)
  const track = MeshBuilder.CreateTorus(
    'track',
    {
      diameter: 0.8,
      thickness: 0.04,
      tessellation: 64,
    },
    scene,
  );
  track.position = new Vector3(0, 0.09, 0); // top of platter
  track.parent = platter;

  // Track material (same as platter but slightly darker)
  const trackMaterial = new PBRMaterial('trackMaterial', scene);
  trackMaterial.metallic = 0.9;
  trackMaterial.roughness = 0.5;
  trackMaterial.albedoColor = new Color3(0.03, 0.03, 0.03);
  track.material = trackMaterial;

  // Garage-door slit top box — chunky visible barrier
  const slitTop = MeshBuilder.CreateBox(
    'slitTop',
    {
      width: 0.9,
      height: 0.06,
      depth: 0.5,
    },
    scene,
  );
  slitTop.position = new Vector3(0, 0.12, 0); // upper half, closed position
  slitTop.parent = platter;

  // Slit material — slightly lighter than platter so it's distinguishable
  const slitMaterial = new PBRMaterial('slitMaterial', scene);
  slitMaterial.metallic = 0.85;
  slitMaterial.roughness = 0.5;
  slitMaterial.albedoColor = new Color3(0.06, 0.06, 0.06);
  slitMaterial.emissiveColor = new Color3(0.01, 0.01, 0.01); // subtle edge visibility
  slitTop.material = slitMaterial;

  // Garage-door slit bottom box — lower half of the barrier
  const slitBottom = MeshBuilder.CreateBox(
    'slitBottom',
    {
      width: 0.9,
      height: 0.06,
      depth: 0.5,
    },
    scene,
  );
  slitBottom.position = new Vector3(0, 0.06, 0); // lower half, closed position
  slitBottom.parent = platter;
  slitBottom.material = slitMaterial;

  // MODE_LEVER — procedural tapered shaft with ball joint, grip, and grooves
  const lever = createProceduralLever('lever', scene);
  lever.position = new Vector3(0.55, 0.09, 0); // on rim, top of platter
  lever.parent = platter;

  // Lever material (slightly lighter metal for visibility) — applied to all sub-meshes
  const leverMaterial = new PBRMaterial('leverMaterial', scene);
  leverMaterial.metallic = 0.8;
  leverMaterial.roughness = 0.3;
  leverMaterial.albedoColor = new Color3(0.1, 0.1, 0.1);
  lever.material = leverMaterial;
  // Apply material to all lever child meshes (shaft, ball joint, grip)
  for (const child of lever.getChildMeshes()) {
    child.material = leverMaterial;
  }

  // 14 keycaps distributed in 160° front arc — procedural sculpted geometry
  const keycaps: Mesh[] = [];
  const rimPositions = new Map<string, { x: number; y: number; z: number }>();
  const keycapCount = 14;
  const platterRadius = 0.6; // 1.2m diameter / 2
  const keycapLetters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];

  for (let i = 0; i < keycapCount; i++) {
    // 160° arc centered on +Z (toward camera) instead of full 360°
    const arcSpan = (160 / 180) * Math.PI; // ~2.79 rad
    const arcCenter = Math.PI / 2; // +Z direction in cos/sin XZ plane
    const arcStart = arcCenter - arcSpan / 2;
    const angle = arcStart + (i / (keycapCount - 1)) * arcSpan;
    const x = Math.cos(angle) * platterRadius;
    const z = Math.sin(angle) * platterRadius;
    rimPositions.set(keycapLetters[i], { x, y: 0.09, z });

    const keycap = createProceduralKeycap(`keycap-${keycapLetters[i]}`, scene);
    // Start retracted at platter center, hidden inside (emerged by MechanicalAnimationSystem)
    keycap.position = new Vector3(0, -0.02, 0);
    keycap.parent = platter;
    keycap.rotation.y = Math.PI; // face toward camera (+Z)
    keycap.setEnabled(false); // invisible until emerged

    // DynamicTexture with letter label (128x128 px)
    const letterTexture = new DynamicTexture(
      `keycapTexture-${keycapLetters[i]}`,
      { width: 128, height: 128 },
      scene,
      true,
    );
    const textureCtx = letterTexture.getContext();
    // White/light gray background
    textureCtx.fillStyle = '#E8E8EC';
    textureCtx.fillRect(0, 0, 128, 128);
    // Bold black letter centered
    textureCtx.fillStyle = '#111111';
    textureCtx.font = 'bold 80px monospace';
    (textureCtx as any).textAlign = 'center';
    (textureCtx as any).textBaseline = 'middle';
    textureCtx.fillText(keycapLetters[i], 64, 68);
    letterTexture.update();

    // StandardMaterial with DynamicTexture for readable letter labels
    const keycapMaterial = new StandardMaterial(`keycapMaterial-${keycapLetters[i]}`, scene);
    keycapMaterial.diffuseTexture = letterTexture;
    keycapMaterial.diffuseColor = new Color3(0.9, 0.9, 0.92); // near-white base
    keycapMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
    keycapMaterial.emissiveColor = new Color3(0.12, 0.12, 0.14); // subtle glow for visibility
    keycap.material = keycapMaterial;

    keycaps.push(keycap);
  }

  // 52cm diameter glass sphere (0.52m)
  const sphere = MeshBuilder.CreateSphere(
    'sphere',
    {
      diameter: 0.52,
      segments: 64,
    },
    scene,
  );
  sphere.position = new Vector3(0, 0.09, 0); // on track, top of platter
  sphere.parent = platter;

  // Glass PBR material (will be replaced by SphereNebulaMaterial in Task 13)
  const sphereMaterial = new PBRMaterial('sphereMaterial', scene);
  sphereMaterial.metallic = 0.0;
  sphereMaterial.roughness = 0.05;
  sphereMaterial.alpha = 0.3; // translucent glass
  sphereMaterial.albedoColor = new Color3(0.8, 0.9, 1.0); // slight blue tint
  sphere.material = sphereMaterial;

  // ── PLAY keycap — visible between slit halves, glowing, inviting ──
  const playKeycap = createProceduralMenuKeycap('keycap-PLAY', scene);
  playKeycap.position = new Vector3(0, 0.10, 0.15); // at surface, slightly forward toward camera
  playKeycap.parent = platter;
  playKeycap.rotation.y = Math.PI; // face toward camera

  const playMaterial = new PBRMaterial('playKeycapMaterial', scene);
  playMaterial.metallic = 0.6;
  playMaterial.roughness = 0.3;
  playMaterial.albedoColor = new Color3(0.1, 0.3, 0.1); // dark green tint (PLAY)
  playMaterial.emissiveColor = new Color3(0.1, 0.4, 0.1); // bright green glow — visible through overlay
  playKeycap.material = playMaterial;

  // ── CONTINUE keycap (menu key — hidden below slit) — procedural sculpted geometry ──
  const continueKeycap = createProceduralMenuKeycap('keycap-CONTINUE', scene);
  continueKeycap.position = new Vector3(0.1, -0.05, 0); // hidden below platter surface
  continueKeycap.parent = platter;

  const continueMaterial = new PBRMaterial('continueKeycapMaterial', scene);
  continueMaterial.metallic = 0.6;
  continueMaterial.roughness = 0.3;
  continueMaterial.albedoColor = new Color3(0.1, 0.15, 0.3); // dark blue tint (CONTINUE)
  continueMaterial.emissiveColor = new Color3(0.02, 0.03, 0.08);
  continueKeycap.material = continueMaterial;

  return {
    platter,
    track,
    slitTop,
    slitBottom,
    lever,
    keycaps,
    sphere,
    playKeycap,
    continueKeycap,
    rimPositions,
  };
}
