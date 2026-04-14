/**
 * Glass sphere — Three.js MeshPhysicalMaterial with transmission.
 *
 * Spec: research/visuals/06-glass-sphere.md
 *
 * This is the heart of the game's visual identity: a fragile crystalline
 * sphere containing the celestial nebula. In the Babylon implementation we
 * fake it with PBRMaterial + alpha + indexOfRefraction; in Three.js the
 * idiomatic approach is MeshPhysicalMaterial with `transmission`, which
 * gives real refraction through a transmission render target.
 *
 * Requires an environment map for believable reflections — the harness
 * should set `scene.environment` or we pass an envMap directly.
 *
 * Design target:
 *  - Thin glass shell (~0.5 thickness)
 *  - IOR 1.5 (standard glass)
 *  - Near-zero roughness when calm, increases with tension (frosted)
 *  - Subtle attenuation tint shifts blue→red with tension
 *  - Visible specular highlights from a key light
 */

import {
  Color,
  Mesh,
  MeshPhysicalMaterial,
  type Scene,
  SphereGeometry,
  type Texture,
  Vector3,
} from 'three';

export interface GlassSphereOptions {
  radius?: number;
  position?: Vector3;
  /** Environment map for reflections + refraction background. */
  envMap?: Texture | null;
  /** 0 = calm (clear), 1 = crisis (frosted + red tint). */
  tension?: number;
}

export interface GlassSphere {
  mesh: Mesh;
  material: MeshPhysicalMaterial;
  /**
   * Update material properties based on tension.
   * Maps tension → roughness, attenuationColor, iridescence.
   */
  setTension(tension: number): void;
  dispose(): void;
}

const CALM_COLOR = new Color(0x88aaff);
const CRISIS_COLOR = new Color(0xff4433);
const CLEAR = new Color(0xffffff);

export function createGlassSphere(scene: Scene, opts: GlassSphereOptions = {}): GlassSphere {
  const { radius = 1, position = new Vector3(0, 0, 0), envMap = null, tension = 0 } = opts;

  const geometry = new SphereGeometry(radius, 64, 32);

  const material = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 1.0,
    thickness: 0.5,
    ior: 1.5,
    envMap,
    envMapIntensity: 1.0,
    specularIntensity: 1.0,
    specularColor: 0xffffff,
    attenuationColor: CALM_COLOR.clone(),
    attenuationDistance: 4.0,
    transparent: true,
    side: 2, // THREE.DoubleSide — keeps the back of the sphere visible
  });

  const mesh = new Mesh(geometry, material);
  mesh.position.copy(position);
  scene.add(mesh);

  function setTension(t: number): void {
    const clamped = Math.max(0, Math.min(1, t));
    // Roughness: perfectly clear → frosted at crisis
    material.roughness = 0.02 + clamped * 0.35;
    // Attenuation: blue tint shifts toward red as tension rises
    material.attenuationColor.copy(CALM_COLOR).lerp(CRISIS_COLOR, clamped);
    // Iridescence kicks in past halfway — soap-bubble stress fractures
    material.iridescence = Math.max(0, clamped - 0.5) * 2;
    material.iridescenceIOR = 1.3;
    material.iridescenceThicknessRange = [100, 400 + clamped * 200];
    // Clearcoat always on; gets grittier under stress
    material.clearcoat = 1.0;
    material.clearcoatRoughness = clamped * 0.4;
    material.needsUpdate = true;
  }

  setTension(tension);

  return {
    mesh,
    material,
    setTension,
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}

export { CALM_COLOR, CRISIS_COLOR, CLEAR };
