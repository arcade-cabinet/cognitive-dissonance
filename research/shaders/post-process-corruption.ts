/**
 * Post-process corruption — Three.js + pmndrs/postprocessing implementation.
 *
 * Spec: research/visuals/04-post-process-corruption.md
 *
 * Uses the modern pmndrs postprocessing library (EffectComposer + EffectPass +
 * custom Effect class) instead of the legacy three/examples/jsm/postprocessing
 * chain. This is the recommended pattern for custom full-screen effects in
 * current Three.js work.
 *
 * Port of the inline shader in src/components/post-process-corruption.tsx,
 * rewritten to use the `mainImage(inputColor, uv, outputColor)` signature
 * required by postprocessing's Effect base class.
 */

import { BlendFunction, Effect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import type { Camera, Scene, WebGLRenderer } from 'three';
import { Uniform } from 'three';

const FRAGMENT_SHADER = /* glsl */ `
  uniform float u_tension;
  uniform float u_time;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float t = u_tension;

    // Chromatic aberration — sample neighbours from the input buffer.
    float offset = t * 0.008;
    float r = texture2D(inputBuffer, uv + vec2(offset, 0.0)).r;
    float g = texture2D(inputBuffer, uv).g;
    float b = texture2D(inputBuffer, uv - vec2(offset, 0.0)).b;
    vec3 color = vec3(r, g, b);

    // Film noise
    float noise = fract(sin(dot(uv + u_time, vec2(12.9898, 78.233))) * 43758.5453);
    color += (noise - 0.5) * t * 0.15;

    // Vignette
    float vignette = 1.0 - length((uv - 0.5) * 1.4) * t * 0.8;
    color *= vignette;

    // Scanlines
    color -= sin(uv.y * 800.0 + u_time * 10.0) * t * 0.03;

    outputColor = vec4(color, inputColor.a);
  }
`;

export interface CorruptionUniformValues {
  tension: number;
  time: number;
}

/**
 * Custom Effect implementing the CRT-corruption look.
 *
 * Extends postprocessing's Effect base class. The library automatically
 * supplies `inputBuffer` and calls `mainImage` — we just need to declare
 * our own uniforms and fragment body.
 */
export class CorruptionEffect extends Effect {
  constructor(initial: CorruptionUniformValues = { tension: 0.5, time: 0 }) {
    super('CorruptionEffect', FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform<number>>([
        ['u_tension', new Uniform(initial.tension)],
        ['u_time', new Uniform(initial.time)],
      ]),
    });
  }

  get tension(): number {
    return (this.uniforms.get('u_tension') as Uniform<number>).value;
  }
  set tension(v: number) {
    (this.uniforms.get('u_tension') as Uniform<number>).value = v;
  }

  get time(): number {
    return (this.uniforms.get('u_time') as Uniform<number>).value;
  }
  set time(v: number) {
    (this.uniforms.get('u_time') as Uniform<number>).value = v;
  }
}

export interface CorruptionPass {
  composer: EffectComposer;
  effect: CorruptionEffect;
  /** Call each frame; advances u_time. */
  update(deltaSeconds: number): void;
  /** Render the full composer pipeline (RenderPass + corruption). */
  render(deltaSeconds?: number): void;
  dispose(): void;
}

/**
 * Wire an EffectComposer with a RenderPass and the corruption EffectPass.
 *
 * @param renderer - Three.js WebGLRenderer
 * @param scene - scene to render before applying corruption
 * @param camera - camera for the RenderPass
 * @param initial - initial uniform values (default: tension=0.5, time=0)
 */
export function createCorruptionPass(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  initial: CorruptionUniformValues = { tension: 0.5, time: 0 },
): CorruptionPass {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const effect = new CorruptionEffect(initial);
  composer.addPass(new EffectPass(camera, effect));

  return {
    composer,
    effect,
    update(deltaSeconds: number) {
      effect.time += deltaSeconds;
    },
    render(deltaSeconds = 1 / 60) {
      composer.render(deltaSeconds);
    },
    dispose() {
      composer.dispose();
    },
  };
}
