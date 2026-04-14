/**
 * Industrial platter — Three.js MeshPhysicalMaterial with anisotropy.
 *
 * Spec: research/visuals/07-industrial-platter.md
 *
 * The black metal slab the glass sphere sits on. Babylon uses plain PBR
 * metal (metallic=0.92, roughness=0.28). In Three we use MeshPhysicalMaterial
 * with `anisotropy` to get the brushed-disc look a lathe-turned platter
 * actually has — circular grain that catches a rim highlight.
 *
 * Components:
 *   - base: main disc (thick, near-black, brushed)
 *   - rim: raised outer band (darker, glossier, carries the emissive text later)
 *   - track: inner recess the sphere rests in
 */

import * as THREE from 'three';
import { CylinderGeometry, type Group, type Mesh, MeshPhysicalMaterial, type Scene, Vector3 } from 'three';

export interface PlatterOptions {
  position?: Vector3;
  /** 0-1 tension drives rim emissive intensity and recess glow shift. */
  tension?: number;
}

export interface IndustrialPlatter {
  group: Group;
  baseMesh: Mesh;
  rimMesh: Mesh;
  trackMesh: Mesh;
  baseMaterial: MeshPhysicalMaterial;
  rimMaterial: MeshPhysicalMaterial;
  trackMaterial: MeshPhysicalMaterial;
  setTension(t: number): void;
  dispose(): void;
}

const RIM_CALM = new THREE.Color(0x001a33);
const RIM_CRISIS = new THREE.Color(0x992211);

export function createIndustrialPlatter(scene: Scene, opts: PlatterOptions = {}): IndustrialPlatter {
  const { position = new Vector3(0, 0, 0), tension = 0 } = opts;

  const group = new THREE.Group();
  group.position.copy(position);
  scene.add(group);

  // Base — wide flat disc, brushed dark metal
  const baseGeom = new CylinderGeometry(1.5, 1.5, 0.32, 128);
  const baseMaterial = new MeshPhysicalMaterial({
    color: 0x141418,
    metalness: 0.92,
    roughness: 0.28,
    anisotropy: 0.9, // strong brushed grain
    anisotropyRotation: 0, // radial — rim-highlight rings form under a key light
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
  });
  const base = new THREE.Mesh(baseGeom, baseMaterial);
  group.add(base);

  // Rim — slightly raised outer band with emissive groove
  const rimGeom = new CylinderGeometry(1.6, 1.6, 0.2, 128, 1, true); // open cylinder (side only)
  const rimMaterial = new MeshPhysicalMaterial({
    color: 0x0f0f12,
    metalness: 0.96,
    roughness: 0.18,
    emissive: RIM_CALM.clone(),
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const rim = new THREE.Mesh(rimGeom, rimMaterial);
  rim.position.y = 0.15;
  group.add(rim);

  // Track — inner recess the sphere sits in
  const trackGeom = new CylinderGeometry(0.39, 0.39, 0.25, 64);
  const trackMaterial = new MeshPhysicalMaterial({
    color: 0x0f0f12,
    metalness: 0.82,
    roughness: 0.38,
    anisotropy: 0.6,
  });
  const track = new THREE.Mesh(trackGeom, trackMaterial);
  track.position.y = 0.4;
  group.add(track);

  function setTension(t: number): void {
    const c = Math.max(0, Math.min(1, t));
    rimMaterial.emissive.copy(RIM_CALM).lerp(RIM_CRISIS, c);
    rimMaterial.emissiveIntensity = 0.05 + c * 0.8;
    // Metal gets slightly rougher under stress — thermal stress / wear
    baseMaterial.roughness = 0.28 + c * 0.12;
  }

  setTension(tension);

  return {
    group,
    baseMesh: base,
    rimMesh: rim,
    trackMesh: track,
    baseMaterial,
    rimMaterial,
    trackMaterial,
    setTension,
    dispose() {
      scene.remove(group);
      baseGeom.dispose();
      rimGeom.dispose();
      trackGeom.dispose();
      baseMaterial.dispose();
      rimMaterial.dispose();
      trackMaterial.dispose();
    },
  };
}
