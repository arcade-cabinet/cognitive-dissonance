/**
 * Celestial nebula — Three.js implementation.
 *
 * Spec: research/visuals/01-celestial-nebula.md
 *
 * Direct port of src/lib/shaders/celestial.ts. The fragment shader is
 * unchanged; only the framework wrapping differs (Three's RawShaderMaterial
 * vs Babylon's ShaderMaterial + Effect.ShadersStore).
 */

import {
  Color,
  type Mesh,
  type Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUV;
  void main() {
    vUV = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  varying vec2 vUV;
  uniform float u_time;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform float u_cloud_density;
  uniform float u_glow_intensity;

  float random(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 151.7182))) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(random(i + vec3(0,0,0)), random(i + vec3(1,0,0)), u.x),
          mix(random(i + vec3(0,1,0)), random(i + vec3(1,1,0)), u.x), u.y),
      mix(mix(random(i + vec3(0,0,1)), random(i + vec3(1,0,1)), u.x),
          mix(random(i + vec3(0,1,1)), random(i + vec3(1,1,1)), u.x), u.y),
      u.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 6; i++) {
      v += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUV * 2.0 - 1.0;
    float d = 1.0 - dot(uv, uv);
    if (d < 0.0) discard;
    vec3 pos = vec3(uv, sqrt(d));
    vec3 coord = pos * u_cloud_density + u_time * 0.1;
    float c = fbm(coord);
    vec3 nebula = mix(u_color1, u_color2, smoothstep(0.4, 0.6, c));
    float fresnel = pow(1.0 - max(dot(normalize(pos), vec3(0,0,1)), 0.0), 2.0) * u_glow_intensity;
    vec3 glow = fresnel * u_color2;
    gl_FragColor = vec4(nebula + glow, 1.0);
  }
`;

export interface CelestialUniforms {
  u_time: { value: number };
  u_color1: { value: Color };
  u_color2: { value: Color };
  u_cloud_density: { value: number };
  u_glow_intensity: { value: number };
}

export interface CelestialNebula {
  mesh: Mesh;
  material: ShaderMaterial;
  uniforms: CelestialUniforms;
  /** Call each frame; advances u_time. */
  update(deltaSeconds: number): void;
  dispose(): void;
}

/** Default uniform values matching src/lib/shaders/celestial.ts setup. */
export const DEFAULT_CELESTIAL_UNIFORMS = (): CelestialUniforms => ({
  u_time: { value: 0 },
  u_color1: { value: new Color('#082f49') }, // deep navy
  u_color2: { value: new Color('#7dd3fc') }, // sky cyan
  u_cloud_density: { value: 2.5 },
  u_glow_intensity: { value: 1.5 },
});

/**
 * Mount a celestial nebula sphere onto a Three.js scene.
 *
 * @param scene - target Three.js Scene
 * @param diameter - sphere diameter (default 0.49 — matches game's inner sphere)
 * @param position - world position (default origin)
 * @param uniforms - optional overrides for default uniform values
 */
export function createCelestialNebula(
  scene: Scene,
  diameter = 0.49,
  position = new Vector3(0, 0, 0),
  uniforms: CelestialUniforms = DEFAULT_CELESTIAL_UNIFORMS(),
): CelestialNebula {
  const geometry = new SphereGeometry(diameter / 2, 64, 64);
  const material = new ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
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
