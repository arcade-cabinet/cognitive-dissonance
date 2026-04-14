/**
 * ATC scanner — Three.js implementation.
 *
 * Spec: research/visuals/05-atc-scanner.md
 *
 * Direct port of the inline GLSL in src/components/ui/atc-shader.tsx.
 * 50-iteration accumulating raymarcher, tanh-saturated, rendered onto a
 * fullscreen PlaneGeometry positioned at the camera near plane.
 *
 * The original used a raw WebGL2 context and gl_FragCoord directly. In
 * Three.js we use vUV to reconstruct equivalent screen coordinates, scaling
 * by u_res to match the gl_FragCoord-based math in the original.
 */

import { type Mesh, PlaneGeometry, type Scene, ShaderMaterial, Vector2, Vector3 } from 'three';
import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUV;
  void main() {
    vUV = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The original used #version 300 es with gl_FragCoord. Here we reconstruct
// equivalent screen-space coordinates from vUV * u_res, matching the math.
const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUV;
  uniform vec2  u_res;
  uniform float u_time;

  float tanh1(float x) { float e = exp(2.0 * x); return (e - 1.0) / (e + 1.0); }

  vec4 tanh4(vec4 v) {
    return vec4(tanh1(v.x), tanh1(v.y), tanh1(v.z), tanh1(v.w));
  }

  void main() {
    // Reconstruct gl_FragCoord equivalent from UV
    vec3 FC = vec3(vUV * u_res, 0.0);
    vec3 r  = vec3(u_res, max(u_res.x, u_res.y));
    float t = u_time;

    vec4 o = vec4(0.0);
    vec3 p = vec3(0.0);
    vec3 v = vec3(1.0, 2.0, 6.0);
    float i = 0.0, z = 1.0, d = 1.0, f = 1.0;

    for ( ; i++ < 5e1;
          o.rgb += (cos((p.x + z + v) * 0.1) + 1.0) / d / f / z )
    {
      p = z * normalize(FC * 2.0 - r.xyy);

      vec4 m = cos((p + sin(p)).y * 0.4 + vec4(0.0, 33.0, 11.0, 0.0));
      p.xz = mat2(m) * p.xz;

      p.x += t / 0.2;

      z += ( d = length(cos(p / v) * v + v.zxx / 7.0) /
             ( f = 2.0 + d / exp(p.y * 0.2) ) );
    }

    o = tanh4(0.2 * o);
    o.a = 1.0;
    gl_FragColor = o;
  }
`;

export interface ATCScannerUniforms {
  u_res: { value: Vector2 };
  u_time: { value: number };
}

export interface ATCScanner {
  mesh: Mesh;
  material: ShaderMaterial;
  uniforms: ATCScannerUniforms;
  /** Call each frame; advances u_time. */
  update(deltaSeconds: number): void;
  dispose(): void;
}

/** Default uniform values — 512×512 viewport. */
export const DEFAULT_ATC_SCANNER_UNIFORMS = (
  width = 512,
  height = 512,
): ATCScannerUniforms => ({
  u_res: { value: new Vector2(width, height) },
  u_time: { value: 0 },
});

/**
 * Mount an ATC scanner fullscreen quad onto a Three.js scene.
 *
 * Position the plane far back (large negative z) so other scene objects
 * render in front of it.
 *
 * @param scene - target Three.js Scene
 * @param size - plane size in world units (default 10 — large enough to fill)
 * @param position - world position (default slightly behind origin)
 * @param uniforms - optional overrides; u_res should match viewport dimensions
 */
export function createATCScanner(
  scene: Scene,
  size = 10.0,
  position = new Vector3(0, 0, -4),
  uniforms: ATCScannerUniforms = DEFAULT_ATC_SCANNER_UNIFORMS(),
): ATCScanner {
  const geometry = new PlaneGeometry(size, size);
  const material = new ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  // Render behind everything else
  mesh.renderOrder = -1;
  scene.add(mesh);

  return {
    mesh,
    material,
    uniforms,
    update(deltaSeconds: number) {
      uniforms.u_time.value += deltaSeconds;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
