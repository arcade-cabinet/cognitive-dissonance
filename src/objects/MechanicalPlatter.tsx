import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Scene } from '@babylonjs/core/scene';

export interface PlatterComponents {
  platter: Mesh;
  track: Mesh;
  slitTop: Mesh;
  slitBottom: Mesh;
  lever: Mesh;
  keycaps: Mesh[];
  sphere: Mesh;
}

/**
 * Factory function to create the mechanical platter with all components.
 *
 * Components:
 * - Platter: Heavy industrial cylinder (0.18m × 1.2m) with PBR near-black metal
 * - Track: Recessed torus (0.8m × 0.04m) for sphere constraint
 * - Slit: Garage-door top/bottom boxes (0.9m wide)
 * - Lever: MODE_LEVER box (0.08 × 0.12 × 0.04m at x=0.55)
 * - Keycaps: 14 boxes on rim (polar distribution)
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

  // Garage-door slit top box (0.9m wide, 0.02m thick, 0.1m tall)
  const slitTop = MeshBuilder.CreateBox(
    'slitTop',
    {
      width: 0.9,
      height: 0.02,
      depth: 0.1,
    },
    scene,
  );
  slitTop.position = new Vector3(0, 0.1, 0); // above platter surface
  slitTop.parent = platter;

  // Slit top material (darker metal)
  const slitMaterial = new PBRMaterial('slitMaterial', scene);
  slitMaterial.metallic = 0.85;
  slitMaterial.roughness = 0.6;
  slitMaterial.albedoColor = new Color3(0.02, 0.02, 0.02);
  slitTop.material = slitMaterial;

  // Garage-door slit bottom box (same dimensions)
  const slitBottom = MeshBuilder.CreateBox(
    'slitBottom',
    {
      width: 0.9,
      height: 0.02,
      depth: 0.1,
    },
    scene,
  );
  slitBottom.position = new Vector3(0, -0.1, 0); // below platter surface
  slitBottom.parent = platter;
  slitBottom.material = slitMaterial;

  // MODE_LEVER box (0.08 × 0.12 × 0.04m at x=0.55 on rim)
  const lever = MeshBuilder.CreateBox(
    'lever',
    {
      width: 0.08,
      height: 0.12,
      depth: 0.04,
    },
    scene,
  );
  lever.position = new Vector3(0.55, 0.09, 0); // on rim, top of platter
  lever.parent = platter;

  // Lever material (slightly lighter metal for visibility)
  const leverMaterial = new PBRMaterial('leverMaterial', scene);
  leverMaterial.metallic = 0.8;
  leverMaterial.roughness = 0.3;
  leverMaterial.albedoColor = new Color3(0.1, 0.1, 0.1);
  lever.material = leverMaterial;

  // 14 keycaps distributed around rim (polar coordinates)
  const keycaps: Mesh[] = [];
  const keycapCount = 14;
  const platterRadius = 0.6; // 1.2m diameter / 2
  const keycapLetters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];

  for (let i = 0; i < keycapCount; i++) {
    const angle = (i / keycapCount) * Math.PI * 2;
    const x = Math.cos(angle) * platterRadius;
    const z = Math.sin(angle) * platterRadius;

    const keycap = MeshBuilder.CreateBox(
      `keycap-${keycapLetters[i]}`,
      {
        width: 0.08,
        height: 0.04,
        depth: 0.08,
      },
      scene,
    );
    keycap.position = new Vector3(x, 0.09, z); // on rim, top of platter
    keycap.parent = platter;

    // Keycap material (lighter metal with slight color tint)
    const keycapMaterial = new PBRMaterial(`keycapMaterial-${keycapLetters[i]}`, scene);
    keycapMaterial.metallic = 0.7;
    keycapMaterial.roughness = 0.4;
    keycapMaterial.albedoColor = new Color3(0.15, 0.15, 0.18); // slight blue tint
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

  return {
    platter,
    track,
    slitTop,
    slitBottom,
    lever,
    keycaps,
    sphere,
  };
}
