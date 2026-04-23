/**
 * AI core — composite glass shell + celestial nebula interior.
 *
 * This is the "AISphere" component: a thin transmissive shell wrapping the
 * celestial-nebula shader. In Babylon it's two co-located spheres; in Three
 * it's the same, but the outer uses MeshPhysicalMaterial transmission and
 * the inner uses our celestial ShaderMaterial port.
 *
 * Not listed in the 12-piece inventory because it's a *composite* — it reuses
 * glass-sphere and celestial-nebula. Treated here as a presentation piece so
 * we can screenshot the full "inside the glass" look.
 */

import { Color, type Mesh, type Scene, Vector3 } from 'three';
import { type CelestialNebula, createCelestialNebula } from './celestial-nebula';
import { createGlassSphere, type GlassSphere } from './glass-sphere';
import { SPHERE_RADIUS, SPHERE_Y } from './physics-setup';

export interface AICoreOptions {
  position?: Vector3;
  /** Outer glass shell diameter. Inner nebula is slightly smaller. */
  outerRadius?: number;
  /** 0-1 stress/tension; feeds both glass frost and nebula palette shift. */
  tension?: number;
}

export interface AICore {
  glass: GlassSphere;
  nebula: CelestialNebula;
  outerMesh: Mesh;
  innerMesh: Mesh;
  setTension(t: number): void;
  update(deltaSeconds: number): void;
  dispose(): void;
}

// Nebula palette endpoints — calm is the game's default blue, crisis pushes
// toward red/magenta the way the running game does under tension.
const CALM_COLOR1 = new Color('#082f49'); // deep navy
const CALM_COLOR2 = new Color('#7dd3fc'); // sky cyan
const CRISIS_COLOR1 = new Color('#1a0a18'); // smothered violet
const CRISIS_COLOR2 = new Color('#ff4440'); // angry red

export function createAICore(scene: Scene, opts: AICoreOptions = {}): AICore {
  const { position = new Vector3(0, SPHERE_Y, 0), outerRadius = SPHERE_RADIUS, tension = 0 } = opts;

  // Inner nebula first so it draws underneath the glass in render order.
  const nebula = createCelestialNebula(scene, outerRadius * 0.94 * 2, position);
  const glass = createGlassSphere(scene, { radius: outerRadius, position, tension });

  // Thinner shell read — nebula already glows, glass just needs to refract.
  glass.material.opacity = 0.9;

  function setTension(t: number): void {
    const c = Math.max(0, Math.min(1, t));
    glass.setTension(c);
    // Lerp the nebula palette toward crisis colors as tension rises.
    nebula.uniforms.u_color1.value.copy(CALM_COLOR1).lerp(CRISIS_COLOR1, c);
    nebula.uniforms.u_color2.value.copy(CALM_COLOR2).lerp(CRISIS_COLOR2, c);
    // Crank glow + density under stress — clouds churn harder.
    nebula.uniforms.u_cloud_density.value = 2.5 + c * 2.0;
    nebula.uniforms.u_glow_intensity.value = 1.5 + c * 1.5;
  }

  setTension(tension);

  return {
    glass,
    nebula,
    outerMesh: glass.mesh,
    innerMesh: nebula.mesh,
    setTension,
    update(deltaSeconds: number) {
      nebula.update(deltaSeconds);
    },
    dispose() {
      nebula.dispose();
      glass.dispose();
    },
  };
}
