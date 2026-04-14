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
import {
  CanvasTexture,
  CylinderGeometry,
  type Group,
  type Mesh,
  MeshPhysicalMaterial,
  RepeatWrapping,
  type Scene,
  Vector3,
} from 'three';

export interface PlatterOptions {
  position?: Vector3;
  /** 0-1 tension drives rim emissive intensity and recess glow shift. */
  tension?: number;
  /** Diegetic rim text, repeats around the circumference. */
  rimText?: string;
}

/**
 * Paint a rim-text canvas. Wide strip so the text repeats around the rim
 * cylinder. Stark white-on-black so the emissive map reads cleanly when
 * the rim material modulates it with its emissive color + intensity.
 */
function makeRimTextTexture(text: string): CanvasTexture {
  const width = 2048;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Separator glyph + spaces so the phrase reads as repeating etching.
    const unit = `  ${text}  ·  `;
    // Render 4 copies across the canvas so seams hide when the texture
    // wraps — each copy sits at 1/4 offsets.
    for (let i = 0; i < 4; i++) {
      ctx.fillText(unit, (width * (i + 0.5)) / 4, height / 2);
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
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

export function createIndustrialPlatter(scene: Scene, opts: PlatterOptions = {}): IndustrialPlatter {
  const { position = new Vector3(0, 0, 0), tension = 0, rimText = 'MAINTAIN COHERENCE' } = opts;

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

  // Rim — slightly raised outer band with emissive groove + etched text.
  // Rim is tall enough to read the text legibly from the default camera.
  const rimGeom = new CylinderGeometry(1.6, 1.6, 0.28, 128, 1, true); // open cylinder (side only)
  const rimTextTex = makeRimTextTexture(rimText);
  const rimMaterial = new MeshPhysicalMaterial({
    color: 0x0f0f12,
    metalness: 0.96,
    roughness: 0.18,
    // White emissive so the text map's white pixels render white-hot; the
    // setTension() tint pushes the color + intensity at high tension.
    emissive: 0xffffff,
    emissiveIntensity: 0.35,
    emissiveMap: rimTextTex,
    side: THREE.DoubleSide,
  });
  const rim = new THREE.Mesh(rimGeom, rimMaterial);
  rim.position.y = 0.19;
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

  // Calm uses a soft white so the text reads neutral; crisis swings it red.
  const _rimCalm = new THREE.Color(0xccddff);
  const _rimCrisis = new THREE.Color(0xff3322);

  function setTension(t: number): void {
    const c = Math.max(0, Math.min(1, t));
    rimMaterial.emissive.copy(_rimCalm).lerp(_rimCrisis, c);
    // Brighten overall emissive with tension so rim glows hotter.
    rimMaterial.emissiveIntensity = 0.35 + c * 1.8;
    // Metal gets slightly rougher under stress — thermal stress / wear.
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
      rimTextTex.dispose();
      baseMaterial.dispose();
      rimMaterial.dispose();
      trackMaterial.dispose();
    },
  };
}
