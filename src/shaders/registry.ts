/**
 * Shader Registry — Cognitive Dissonance v3.0
 *
 * All custom shaders stored as static string literals in Effect.ShadersStore (CSP-safe).
 * GLSL-first strategy: Babylon.js auto-converts to WGSL on WebGPU, uses GLSL directly on WebGL2/Native.
 *
 * Common uniform interface:
 * - uniform float tension;        // 0.0–0.999
 * - uniform float time;           // scene elapsed time
 * - uniform float corruptionLevel; // derived from tension
 * - uniform vec3 baseColor;       // archetype-derived
 * - uniform float deviceQualityLOD; // 0.0 (low) to 1.0 (high)
 */

import { Effect } from '@babylonjs/core/Materials/effect';

/**
 * Celestial Nebula Vertex Shader (GLSL)
 *
 * Standard vertex shader with position, normal, and UV pass-through.
 * Breathing pulse applied via uniform scale in material, not in shader.
 */
Effect.ShadersStore.celestialNebulaVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
  vec4 outPosition = worldViewProjection * vec4(position, 1.0);
  gl_Position = outPosition;
  
  vPositionW = vec3(world * vec4(position, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
}
`;

/**
 * Celestial Nebula Fragment Shader (GLSL)
 *
 * Renders a living celestial nebula with:
 * - Turbulence noise (3-octave Perlin-like)
 * - Static noise (high-frequency grain)
 * - Tension-driven color interpolation (blue → red)
 * - Static jitter above tension 0.7
 *
 * Accepts Requirement 9.2, 9.3, 9.5
 */
Effect.ShadersStore.celestialNebulaFragmentShader = `
precision highp float;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

// Common uniforms
uniform float tension;
uniform float time;
uniform float corruptionLevel;
uniform vec3 baseColor;
uniform float deviceQualityLOD;

// Nebula-specific uniforms
uniform vec3 calmColor;    // blue (0.1, 0.6, 1.0)
uniform vec3 violentColor; // red (1.0, 0.3, 0.1)

// Simple hash function for pseudo-random noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D noise function (Perlin-like)
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Turbulence (3-octave fractal noise)
float turbulence(vec2 p, float scale) {
  float t = 0.0;
  float amplitude = 1.0;
  float frequency = scale;
  
  for (int i = 0; i < 3; i++) {
    t += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return t;
}

// Static noise (high-frequency grain)
float staticNoise(vec2 p, float time) {
  return hash(p + vec2(time * 0.1, time * 0.2));
}

void main(void) {
  // Spherical UV coordinates for nebula pattern
  vec3 spherePos = normalize(vPositionW);
  vec2 nebulaUV = vec2(
    atan(spherePos.z, spherePos.x) / 6.28318530718 + 0.5,
    acos(spherePos.y) / 3.14159265359
  );
  
  // Animated turbulence (slow drift)
  float turbScale = mix(2.0, 4.0, deviceQualityLOD); // LOD: low=2.0, high=4.0
  vec2 turbUV = nebulaUV * turbScale + vec2(time * 0.05, time * 0.03);
  float turb = turbulence(turbUV, 1.0);
  
  // Static noise (high-frequency grain)
  float staticIntensity = tension > 0.7 ? (tension - 0.7) / 0.3 : 0.0; // Req 9.5
  float staticGrain = staticNoise(nebulaUV * 100.0, time) * staticIntensity * 0.3;
  
  // Tension-driven color interpolation (Req 9.3)
  vec3 nebulaColor = mix(calmColor, violentColor, tension);
  
  // Combine turbulence and static
  float nebulaBrightness = turb * 0.8 + staticGrain;
  vec3 finalColor = nebulaColor * nebulaBrightness;
  
  // Emissive glow (increases with tension)
  float emissiveStrength = 0.3 + tension * 0.7;
  finalColor *= emissiveStrength;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * AR Occlusion Vertex Shader (GLSL)
 *
 * Standard vertex shader with clip space position output for depth comparison.
 */
Effect.ShadersStore.arOcclusionVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform vec3 cameraPosition;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;
varying vec4 vPosition; // clip space position for depth

void main(void) {
  vec4 outPosition = worldViewProjection * vec4(position, 1.0);
  gl_Position = outPosition;
  
  vPositionW = vec3(world * vec4(position, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
  vPosition = outPosition; // pass clip space position to fragment shader
}
`;

/**
 * AR Occlusion Fragment Shader (GLSL)
 *
 * Implements environment-depth based occlusion for AR/MR.
 * Discards fragments where virtual depth > real depth + threshold.
 *
 * Accepts Requirement 16.2
 */
Effect.ShadersStore.arOcclusionFragmentShader = `
precision highp float;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;
varying vec4 vPosition; // clip space position

// Uniforms
uniform sampler2D environmentDepthTexture;
uniform bool hasEnvironmentDepth;
uniform float depthThreshold; // 0.01 default
uniform vec3 baseColor;
uniform float alpha;
uniform vec3 cameraPosition;

// Crystalline variant uniforms
uniform bool isCrystalline;
uniform vec3 crystallineColor;
uniform float crystallineRefraction;

void main(void) {
  // Compute virtual depth (normalized device coordinates)
  float virtualDepth = vPosition.z / vPosition.w;
  
  // Environment depth occlusion (if available)
  if (hasEnvironmentDepth) {
    // Sample environment depth texture at screen UV
    vec2 screenUV = (vPosition.xy / vPosition.w) * 0.5 + 0.5;
    float realDepth = texture2D(environmentDepthTexture, screenUV).r;
    
    // Discard if virtual object is behind real surface (Req 16.2)
    if (virtualDepth > realDepth + depthThreshold) {
      discard;
    }
  }
  
  // Base color with alpha
  vec3 finalColor = baseColor;
  float finalAlpha = alpha;
  
  // Crystalline variant (for boss)
  if (isCrystalline) {
    // Fresnel-like edge glow
    vec3 viewDir = normalize(vPositionW - cameraPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormalW)), 2.0);
    finalColor = mix(baseColor, crystallineColor, fresnel * 0.6);
    finalAlpha = mix(alpha, 0.95, fresnel);
  }
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

/**
 * Corruption Tendril Vertex Shader (GLSL)
 *
 * Standard vertex shader for SolidParticleSystem cylinders.
 */
Effect.ShadersStore.corruptionTendrilVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec4 color; // SolidParticle color

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;
varying vec4 vColor;

void main(void) {
  vec4 outPosition = worldViewProjection * vec4(position, 1.0);
  gl_Position = outPosition;
  
  vPositionW = vec3(world * vec4(position, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
  vColor = color;
}
`;

/**
 * Corruption Tendril Fragment Shader (GLSL)
 *
 * Renders colored tendrils with emissive glow and tension-driven pulsing.
 * Color comes from SolidParticle.color (seed-derived HSV palette).
 *
 * Accepts Requirement 7.4
 */
Effect.ShadersStore.corruptionTendrilFragmentShader = `
precision highp float;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;
varying vec4 vColor;

// Common uniforms
uniform float tension;
uniform float time;
uniform float corruptionLevel;
uniform float deviceQualityLOD;

void main(void) {
  // Base color from SolidParticle (seed-derived)
  vec3 tendrilColor = vColor.rgb;
  
  // Emissive glow (increases with tension)
  float emissiveStrength = 0.5 + tension * 0.5;
  
  // Pulsing effect (sinusoidal at 2 Hz)
  float pulse = sin(time * 12.56637) * 0.5 + 0.5; // 2 Hz = 2 * 2π rad/s
  float pulseIntensity = tension * 0.3;
  emissiveStrength += pulse * pulseIntensity;
  
  // Edge fade (tendrils fade at ends)
  float edgeFade = smoothstep(0.0, 0.1, vUV.y) * smoothstep(1.0, 0.9, vUV.y);
  
  vec3 finalColor = tendrilColor * emissiveStrength * edgeFade;
  float finalAlpha = vColor.a * edgeFade;
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

/**
 * Crystalline Boss Vertex Shader (GLSL)
 *
 * Standard vertex shader with world position for Fresnel calculations.
 */
Effect.ShadersStore.crystallineBossVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
  vec4 outPosition = worldViewProjection * vec4(position, 1.0);
  gl_Position = outPosition;
  
  vPositionW = vec3(world * vec4(position, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
}
`;

/**
 * Crystalline Boss Fragment Shader (GLSL)
 *
 * Renders crystalline cube boss with:
 * - Fresnel edge glow (cyan-white)
 * - Faceted appearance (quantized normals)
 * - Tension-driven color shift (cyan → magenta)
 * - Pulsing intensity during slam phases
 *
 * Accepts Requirement 12
 */
Effect.ShadersStore.crystallineBossFragmentShader = `
precision highp float;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

// Common uniforms
uniform float tension;
uniform float time;
uniform float corruptionLevel;
uniform vec3 baseColor;
uniform float deviceQualityLOD;
uniform vec3 cameraPosition;

// Boss-specific uniforms
uniform float crushPhase; // 0.0–1.0 (0=emerge, 1=impact)
uniform vec3 crystallineColor; // cyan (0.0, 0.8, 1.0)
uniform vec3 impactColor; // magenta (1.0, 0.2, 0.8)

void main(void) {
  // Fresnel edge glow
  vec3 viewDir = normalize(vPositionW - cameraPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormalW)), 3.0);
  
  // Faceted appearance (quantize normals for crystalline look)
  vec3 quantizedNormal = normalize(floor(vNormalW * 4.0) / 4.0);
  float facetIntensity = abs(dot(quantizedNormal, vec3(0.0, 1.0, 0.0))) * 0.3 + 0.7;
  
  // Tension-driven color shift (cyan → magenta)
  vec3 bossColor = mix(crystallineColor, impactColor, crushPhase);
  
  // Pulsing during slam phases (faster as crushPhase increases)
  float pulseFreq = 6.28318 + crushPhase * 18.84955; // 1 Hz → 4 Hz
  float pulse = sin(time * pulseFreq) * 0.5 + 0.5;
  float pulseIntensity = crushPhase * 0.4;
  
  // Combine effects
  vec3 finalColor = bossColor * facetIntensity;
  finalColor += vec3(1.0) * fresnel * 0.8; // white edge glow
  finalColor *= 1.0 + pulse * pulseIntensity;
  
  // Alpha (semi-transparent with Fresnel boost)
  float finalAlpha = 0.85 + fresnel * 0.15;
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

/**
 * Neon Raymarcher Fragment Shader (GLSL)
 *
 * SDF-based raymarching shader for NeonRaymarcher enemy trait.
 * Renders neon trails with distance field glow.
 *
 * Modernized from MASTER doc Three.js SDF raymarching to Babylon.js 8.
 * Accepts Requirement 11.2 (NeonRaymarcher trait)
 */
Effect.ShadersStore.neonRaymarcherFragmentShader = `
precision highp float;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

// Common uniforms
uniform float tension;
uniform float time;
uniform float corruptionLevel;
uniform vec3 baseColor;
uniform float deviceQualityLOD;
uniform vec3 cameraPosition;

// Raymarcher-specific uniforms
uniform vec3 neonColor; // bright cyan (0.0, 1.0, 1.0)
uniform float morphProgress; // 0.0–1.0

// SDF: Sphere
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

// SDF: Box
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// SDF: Capsule (elongated sphere)
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// Scene SDF (NeonRaymarcher morph: sphere → elongated capsule)
float sceneSDF(vec3 p) {
  // Base sphere
  float sphere = sdSphere(p, 0.5);
  
  // Elongated capsule (NeonRaymarcher trait)
  vec3 capsuleA = vec3(0.0, -0.3 * morphProgress, 0.0);
  vec3 capsuleB = vec3(0.0, 0.3 * morphProgress, 0.0);
  float capsule = sdCapsule(p, capsuleA, capsuleB, 0.3);
  
  // Morph between sphere and capsule
  return mix(sphere, capsule, morphProgress);
}

// Raymarching
float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < 32; i++) { // 32 steps (reduced for performance)
    vec3 p = ro + rd * t;
    float d = sceneSDF(p);
    if (d < 0.001 || t > 10.0) break;
    t += d;
  }
  return t;
}

void main(void) {
  // Ray origin and direction (camera space)
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vPositionW - cameraPosition);
  
  // Raymarch
  float t = raymarch(ro, rd);
  
  // Hit detection
  if (t < 10.0) {
    vec3 hitPos = ro + rd * t;
    
    // Distance field glow (neon trail effect)
    float dist = sceneSDF(hitPos);
    float glow = exp(-dist * 20.0); // exponential falloff
    
    // Neon color with glow
    vec3 finalColor = neonColor * glow;
    
    // Pulsing (fast for NeonRaymarcher)
    float pulse = sin(time * 25.13274) * 0.5 + 0.5; // 4 Hz
    finalColor *= 0.7 + pulse * 0.3;
    
    // Alpha (semi-transparent trails)
    float finalAlpha = glow * 0.8;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
  } else {
    // Miss (transparent)
    discard;
  }
}
`;

/**
 * Initialize shader registry
 *
 * Call this once during engine initialization to register all shaders.
 * Babylon.js will auto-convert GLSL to WGSL on WebGPU platforms.
 */
export function initializeShaderRegistry(): void {
  // Shaders are registered via Effect.ShadersStore assignments above
  // This function exists for explicit initialization call in SystemOrchestrator
}
