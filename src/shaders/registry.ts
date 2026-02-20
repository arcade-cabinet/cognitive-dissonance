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
 *
 * Shader inventory (23 shader pairs/fragments):
 *  1. celestialNebula (vertex+fragment) — Original sphere nebula
 *  2. arOcclusion (vertex+fragment) — AR depth occlusion
 *  3. nebulaCorruption (vertex+fragment) — Living celestial nebula with 3D gradient noise, 6-octave FBM, Fresnel rim
 *  4. crystallineBoss (vertex+fragment) — IQ palette + sine displacement boss
 *  5. corruptionTendril (vertex+fragment) — Sinuous tendril curves
 *  6. neonRaymarcher (vertex+fragment) — Enemy neon trails
 *  7. thinFilmInterference (fragment) — Sphere glass thin-film
 *  8. worldCrushDistortion (vertex+fragment) — Boss slam post-process
 *  9. proceduralKeycapGlow (vertex+fragment) — Keycap letter glow
 * 10. mechanicalCrack (fragment) — Platter crack propagation
 * 11. echoGhost (vertex+fragment) — Ghost keycap shader
 * 12. coherenceRingFill (vertex+fragment) — Ring fill animation
 * 13. dustParticle (vertex+fragment) — Keycap emergence dust
 * 14. shatterShard (vertex+fragment) — Glass shard refraction
 * 15. morphTransition (vertex) — Enemy morph interpolation
 * 16. platterSurface (fragment) — Brushed metal platter
 * 17. leverMechanical (vertex+fragment) — Lever detail + wear
 * 18. sphereBreathing (vertex) — Sphere breathing displacement
 * 19. tensorField (fragment) — Tension field streamlines
 * 20. glassRefraction (fragment) — Sphere glass IOR 1.52
 * 21. enemyTrail (vertex+fragment) — Enemy trailing particles
 * 22. rimHighlight (fragment) — Platter rim edge highlight
 * 23. ambientCorruption (vertex+fragment) — Full-screen corruption overlay
 */

import { Effect } from '@babylonjs/core/Materials/effect';

// ===========================================================================
// 1. Celestial Nebula (vertex + fragment) — Original sphere nebula
// ===========================================================================

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
 * - Tension-driven color interpolation (blue -> red)
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
uniform vec3 warmColor;    // yellow-green (0.6, 0.85, 0.15) — midpoint to avoid purple
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
  // 3-stop ramp: blue -> yellow/green -> red (avoids purple mid-tones)
  vec3 nebulaColor;
  if (tension < 0.45) {
    nebulaColor = mix(calmColor, warmColor, tension / 0.45);
  } else {
    nebulaColor = mix(warmColor, violentColor, (tension - 0.45) / 0.55);
  }

  // Combine turbulence and static
  float nebulaBrightness = turb * 0.8 + staticGrain;
  vec3 finalColor = nebulaColor * nebulaBrightness;

  // Emissive glow (increases with tension)
  float emissiveStrength = 0.3 + tension * 0.7;
  finalColor *= emissiveStrength;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ===========================================================================
// 2. AR Occlusion (vertex + fragment) — Environment-depth AR occlusion
// ===========================================================================

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
uniform float hasEnvironmentDepth;
uniform float depthThreshold; // 0.01 default
uniform vec3 baseColor;
uniform float alpha;
uniform vec3 cameraPosition;

// Crystalline variant uniforms
uniform float isCrystalline;
uniform vec3 crystallineColor;

void main(void) {
  // Compute virtual depth (normalized device coordinates)
  float virtualDepth = vPosition.z / vPosition.w;

  // Environment depth occlusion (if available)
  if (hasEnvironmentDepth > 0.5) {
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
  if (isCrystalline > 0.5) {
    // Fresnel-like edge glow
    vec3 viewDir = normalize(vPositionW - cameraPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormalW)), 2.0);
    finalColor = mix(baseColor, crystallineColor, fresnel * 0.6);
    finalAlpha = mix(alpha, 0.95, fresnel);
  }

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

// ===========================================================================
// 3. Nebula Corruption (vertex + fragment) — PRIMARY sphere shader
//    Living celestial nebula with 3D gradient noise, 6-octave FBM, Fresnel rim
//    glow, breathing pulse, corruption-driven blue->red color interpolation.
// ===========================================================================

/**
 * Nebula Corruption Vertex Shader (GLSL)
 *
 * Vertex shader for the inner nebula sphere with breathing pulse:
 *   sin(time * 1.8) * corruptionLevel * 0.03
 */
Effect.ShadersStore.nebulaCorruptionVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float tension;
uniform float time;
uniform float corruptionLevel;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
  // Breathing pulse: sin(time * 1.8) * corruptionLevel * 0.03
  float breathe = sin(time * 1.8) * corruptionLevel * 0.03;
  vec3 displaced = position * (1.0 + breathe);

  vec4 outPosition = worldViewProjection * vec4(displaced, 1.0);
  gl_Position = outPosition;

  vPositionW = vec3(world * vec4(displaced, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
}
`;

/**
 * Nebula Corruption Fragment Shader (GLSL)
 *
 * Inner nebula sphere rendering with:
 * - 3D gradient noise with trilinear interpolation of 8 corner gradients
 * - FBM noise (6-octave Fractal Brownian Motion)
 * - Fresnel rim glow shifting blue->red with tension
 * - Breathing pulse: 1.0 + sin(time * 1.8) * 0.03
 * - Corruption-driven blue->red color interpolation
 * - Static jitter above tension 0.7
 */
Effect.ShadersStore.nebulaCorruptionFragmentShader = `
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

// Nebula-specific uniforms (3-stop color ramp)
uniform vec3 calmColor;    // blue (0.1, 0.6, 1.0)
uniform vec3 warmColor;    // yellow-green (0.6, 0.85, 0.15)
uniform vec3 violentColor; // red (1.0, 0.3, 0.1)

// 3D hash for gradient noise
vec3 hash3(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// 3D Perlin noise with trilinear interpolation of 8 corner gradients
float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
                     dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                 mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                     dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
             mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                     dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                 mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                     dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
}

// 6-octave FBM
float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise3D(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// 2D hash for static jitter
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main(void) {
  // Spherical UV for nebula pattern
  vec3 spherePos = normalize(vPositionW);
  vec2 nebulaUV = vec2(
    atan(spherePos.z, spherePos.x) / 6.28318530718 + 0.5,
    acos(spherePos.y) / 3.14159265359
  );

  // Noise scale driven by LOD
  float noiseScale = mix(2.0, 4.0, deviceQualityLOD);

  // 3D animated noise: scroll through Z with time
  vec3 noisePos = spherePos * noiseScale + vec3(0.0, 0.0, time * 0.3);
  float fbmNoise = fbm(noisePos);

  // Breathing pulse
  float breathe = 1.0 + sin(time * 1.8) * 0.03;
  fbmNoise *= breathe;

  // Color mixing via smoothstep threshold
  float c = fbmNoise * 0.5 + 0.5; // remap from [-1,1] to [0,1]
  float colorMix = smoothstep(0.4, 0.6, c);

  // Corruption-driven 3-stop color ramp: calm -> warm -> violent
  vec3 nebulaColor;
  if (corruptionLevel < 0.45) {
    nebulaColor = mix(calmColor, warmColor, corruptionLevel / 0.45);
  } else {
    nebulaColor = mix(warmColor, violentColor, (corruptionLevel - 0.45) / 0.55);
  }
  // Blend with FBM-driven color variation
  nebulaColor = mix(nebulaColor, nebulaColor * colorMix, 0.5);

  // Fresnel rim glow
  vec3 viewDir = normalize(cameraPosition - vPositionW);
  float fresnel = pow(1.0 - dot(normalize(vNormalW), viewDir), 2.0) * 1.5;

  // Fresnel color shifts with tension (blue rim -> red rim)
  vec3 fresnelColor = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.3, 0.1), tension);

  // High-frequency corruption static at high tension
  float staticGrain = 0.0;
  if (tension > 0.7) {
    float intensity = (tension - 0.7) / 0.3;
    staticGrain = hash(nebulaUV * 80.0 + vec2(time * 0.3)) * intensity * 0.25;
  }

  // Combine
  float brightness = fbmNoise * 0.85 + staticGrain;
  vec3 finalColor = nebulaColor * brightness;

  // Add Fresnel rim glow
  finalColor += fresnelColor * fresnel;

  // Emissive glow scales with tension
  float emissive = 0.3 + tension * 0.7;
  finalColor *= emissive;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ===========================================================================
// 4. Crystalline Boss (vertex + fragment) — IQ palette + sine displacement
// ===========================================================================

/**
 * Crystalline Boss Vertex Shader (GLSL)
 *
 * Sine displacement for faceted crystalline deformation:
 *   float disp = sin(position.x * 8.0 + time) * sin(position.z * 8.0 + time) * 0.05 * tension;
 * Faceted crystalline refraction with Fresnel edge glow.
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
uniform float tension;
uniform float time;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
  // Sine displacement for faceted crystalline deformation
  float disp = sin(position.x * 8.0 + time) * sin(position.z * 8.0 + time) * 0.05 * tension;
  vec3 displaced = position + normal * disp;

  vec4 outPosition = worldViewProjection * vec4(displaced, 1.0);
  gl_Position = outPosition;

  vPositionW = vec3(world * vec4(displaced, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
}
`;

/**
 * Crystalline Boss Fragment Shader (GLSL)
 *
 * IQ palette shader with Fresnel edge glow, crystalline refraction.
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

// IQ palette function: a + b * cos(2*pi * (c*t + d))
vec3 iqPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318530718 * (c * t + d));
}

void main(void) {
  // Fresnel edge glow
  vec3 viewDir = normalize(cameraPosition - vPositionW);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormalW)), 3.0);

  // IQ palette color driven by UV + time
  float palT = vUV.x + vUV.y + time * 0.2;
  vec3 palColor = iqPalette(
    palT,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.33, 0.67)
  );

  // Crystalline refraction approximation
  vec3 refractDir = refract(-viewDir, vNormalW, 1.0 / 1.52);
  float refractIntensity = dot(refractDir, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;

  // Mix palette with refraction and Fresnel glow
  vec3 finalColor = mix(palColor, baseColor, refractIntensity * 0.3);
  finalColor += vec3(0.6, 0.8, 1.0) * fresnel * (0.5 + tension * 0.5);

  // Corruption darkens edges
  finalColor *= 1.0 - corruptionLevel * 0.3;

  gl_FragColor = vec4(finalColor, 0.85 + fresnel * 0.15);
}
`;

// ===========================================================================
// 5. Corruption Tendril (vertex + fragment) — Sinuous tendril curves
// ===========================================================================

/**
 * Corruption Tendril Vertex Shader (GLSL)
 *
 * Sinusoidal deformation for tendril writhing:
 *   position.x += sin(position.y * 6.0 + time * 2.0) * 0.02 * tension;
 */
Effect.ShadersStore.corruptionTendrilVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float tension;
uniform float time;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
  // Sinusoidal deformation for tendril writhing
  vec3 deformed = position;
  deformed.x += sin(position.y * 6.0 + time * 2.0) * 0.02 * tension;
  deformed.z += cos(position.y * 4.0 + time * 1.5) * 0.015 * tension;

  vec4 outPosition = worldViewProjection * vec4(deformed, 1.0);
  gl_Position = outPosition;

  vPositionW = vec3(world * vec4(deformed, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
}
`;

/**
 * Corruption Tendril Fragment Shader (GLSL)
 *
 * Gradient alpha (1.0 at base, 0.0 at tip) with emissive seed-derived color.
 */
Effect.ShadersStore.corruptionTendrilFragmentShader = `
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

void main(void) {
  // Gradient alpha: 1.0 at base (v=0), 0.0 at tip (v=1)
  float gradientAlpha = 1.0 - vUV.y;

  // Emissive seed-derived color with pulsation
  float pulse = sin(time * 3.0 + vUV.y * 6.0) * 0.3 + 0.7;
  vec3 tendrilColor = baseColor * pulse;

  // Corruption intensifies brightness
  tendrilColor *= 1.0 + corruptionLevel * 0.5;

  // Tension drives opacity
  float finalAlpha = gradientAlpha * (0.3 + tension * 0.7);

  gl_FragColor = vec4(tendrilColor, finalAlpha);
}
`;

// ===========================================================================
// 6. Neon Raymarcher (vertex + fragment) — Enemy base shader with neon trails
// ===========================================================================

/**
 * Neon Raymarcher Vertex Shader (GLSL)
 *
 * Standard vertex pass-through for enemy meshes.
 */
Effect.ShadersStore.neonRaymarcherVertexShader = `
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
 * Neon Raymarcher Fragment Shader (GLSL)
 *
 * 128-step SDF raymarcher with smooth-union blended rounded boxes,
 * Blinn-Phong specular, and cyan rim light for enemy neon visuals.
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

// Enemy trait color
uniform vec3 traitColor;

#define MAX_STEPS 128
#define PRECISION 0.0005
#define MAX_DIST 20.0

// Rotation matrix around Y axis
mat3 rotateY(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

// Rotation matrix around X axis
mat3 rotateX(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}

// SDF: rounded box (corner radius 0.03)
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.03;
}

// Smooth union for organic blending (k=0.4)
float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Scene SDF: 3 animated enemy cubes blended together
float sceneSDF(vec3 p) {
  // Primary cube — rotates around Y and X over time
  vec3 p1 = rotateY(time * 1.2) * rotateX(time * 0.7) * p;
  float d1 = sdBox(p1, vec3(0.35));

  // Secondary cube — offset and counter-rotated
  vec3 p2 = p - vec3(0.6 * sin(time * 0.8), 0.3 * cos(time * 0.6), 0.0);
  p2 = rotateY(-time * 0.9) * rotateX(time * 1.1) * p2;
  float d2 = sdBox(p2, vec3(0.2));

  // Tertiary cube — opposite offset
  vec3 p3 = p - vec3(-0.5 * cos(time * 0.7), -0.25 * sin(time * 0.9), 0.4 * sin(time * 0.5));
  p3 = rotateY(time * 1.5) * rotateX(-time * 0.8) * p3;
  float d3 = sdBox(p3, vec3(0.18));

  // Smooth-union blend all three (k=0.4)
  float d = opSmoothUnion(d1, d2, 0.4);
  d = opSmoothUnion(d, d3, 0.4);

  return d;
}

// Compute surface normal via central differences
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
    sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
    sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
  ));
}

// 128-step SDF raymarching
float raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = sceneSDF(p);
    if (d < PRECISION) return t;
    if (t > MAX_DIST) break;
    t += d;
  }
  return -1.0;
}

void main(void) {
  // Screen-space ray setup from UV
  vec2 uv = vUV * 2.0 - 1.0;

  // Camera at (0, 0, 2.3)
  vec3 ro = vec3(0.0, 0.0, 2.3);
  vec3 rd = normalize(vec3(uv, -1.5));

  // Dark base color background
  vec3 bgColor = vec3(0.1, 0.12, 0.15);
  vec3 finalColor = bgColor;

  float t = raymarch(ro, rd);

  if (t > 0.0) {
    vec3 p = ro + rd * t;
    vec3 normal = calcNormal(p);
    vec3 viewDir = normalize(ro - p);

    // Light direction
    vec3 lightDir = normalize(vec3(1.0, 1.2, 0.8));
    vec3 halfDir = normalize(lightDir + viewDir);

    // Diffuse lighting
    float diff = max(dot(normal, lightDir), 0.0);

    // Blinn-Phong specular (pow 32)
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);

    // Ambient term
    float ambient = 0.15;

    // Surface color blended from baseColor and traitColor
    vec3 surfColor = mix(baseColor, traitColor, 0.7);
    vec3 litColor = surfColor * (ambient + diff * 0.7) + vec3(1.0) * spec * 0.6;

    // Cyan rim light: vec3(0.4, 0.8, 1.0) with pow(1-NdotV, 3)
    vec3 rimColor = vec3(0.4, 0.8, 1.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    litColor += rimColor * rim * 0.8;

    // Tension drives emissive intensity
    float emissive = 0.2 + tension * 0.6;
    litColor += traitColor * emissive * 0.3;

    // Corruption shifts toward red
    litColor = mix(litColor, vec3(1.0, 0.0, 0.0), corruptionLevel * 0.2);

    finalColor = litColor;
  }

  // Alpha: opaque on hit, soft falloff on miss for edge blending
  float alpha = t > 0.0 ? 1.0 : smoothstep(0.6, 0.0, length(vUV - 0.5));

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ===========================================================================
// 7. Thin Film Interference (fragment only) — Sphere glass thin-film
// ===========================================================================

/**
 * Thin Film Interference Fragment Shader (GLSL)
 *
 * Thin-film interference for sphere glass: wavelength-dependent refraction
 * using cosine approximation of interference pattern:
 *   float film = cos(dot(viewDir, normal) * 12.0) * 0.5 + 0.5;
 */
Effect.ShadersStore.thinFilmInterferenceFragmentShader = `
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

void main(void) {
  // View direction
  vec3 viewDir = normalize(cameraPosition - vPositionW);
  vec3 normal = normalize(vNormalW);

  // Thin-film interference: wavelength-dependent cosine approximation
  float film = cos(dot(viewDir, normal) * 12.0) * 0.5 + 0.5;

  // Wavelength decomposition for iridescence
  float r = cos(dot(viewDir, normal) * 12.0 + 0.0) * 0.5 + 0.5;
  float g = cos(dot(viewDir, normal) * 12.0 + 2.09) * 0.5 + 0.5;
  float b = cos(dot(viewDir, normal) * 12.0 + 4.18) * 0.5 + 0.5;
  vec3 iridescence = vec3(r, g, b);

  // Blend with base glass color
  vec3 glassColor = mix(baseColor, iridescence, 0.4 + tension * 0.2);

  // Fresnel for rim brightness
  float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.0);
  glassColor += vec3(1.0) * fresnel * 0.3;

  // Corruption desaturates the interference
  float desat = dot(glassColor, vec3(0.299, 0.587, 0.114));
  glassColor = mix(glassColor, vec3(desat), corruptionLevel * 0.5);

  gl_FragColor = vec4(glassColor, 0.7 + fresnel * 0.2);
}
`;

// ===========================================================================
// 8. World Crush Distortion (vertex + fragment) — Boss slam post-process
// ===========================================================================

/**
 * World Crush Distortion Vertex Shader (GLSL)
 *
 * Full-screen quad pass-through for post-process.
 */
Effect.ShadersStore.worldCrushDistortionVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec2 uv;

// Varyings
varying vec2 vUV;

void main(void) {
  gl_Position = vec4(position, 1.0);
  vUV = uv;
}
`;

/**
 * World Crush Distortion Fragment Shader (GLSL)
 *
 * Post-process during boss slam: radial distortion from impact point,
 * screen shake UV offset, chromatic split amplification.
 */
Effect.ShadersStore.worldCrushDistortionFragmentShader = `
precision highp float;

// Varyings
varying vec2 vUV;

// Common uniforms
uniform float tension;
uniform float time;
uniform float corruptionLevel;
uniform vec3 baseColor;
uniform float deviceQualityLOD;

// Post-process uniforms
uniform sampler2D textureSampler;
uniform vec2 impactPoint;         // screen-space impact center (0-1)
uniform float distortionStrength; // 0.0-1.0
uniform vec2 shakeOffset;         // screen shake UV displacement

void main(void) {
  // Apply screen shake
  vec2 uv = vUV + shakeOffset;

  // Radial distortion from impact point
  vec2 delta = uv - impactPoint;
  float dist = length(delta);
  float radialWarp = distortionStrength * 0.1 / (dist + 0.1);
  vec2 warpedUV = uv + normalize(delta + vec2(0.001)) * radialWarp * 0.02;

  // Chromatic aberration split amplified by distortion
  float chromaOffset = distortionStrength * 0.01;
  float r = texture2D(textureSampler, warpedUV + vec2(chromaOffset, 0.0)).r;
  float g = texture2D(textureSampler, warpedUV).g;
  float b = texture2D(textureSampler, warpedUV - vec2(chromaOffset, 0.0)).b;

  vec3 finalColor = vec3(r, g, b);

  // Vignette darkening from impact
  float vignette = smoothstep(0.0, 0.8, dist) * distortionStrength * 0.3;
  finalColor *= 1.0 - vignette;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ===========================================================================
// 9. Procedural Keycap Glow (vertex + fragment) — Keycap letter emissive
// ===========================================================================

/**
 * Procedural Keycap Glow Vertex Shader (GLSL)
 *
 * Standard vertex pass-through for keycap meshes.
 */
Effect.ShadersStore.proceduralKeycapGlowVertexShader = `
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
 * Procedural Keycap Glow Fragment Shader (GLSL)
 *
 * Per-keycap letter glow pulsing with pattern match state.
 * Uses matchProgress uniform to drive glow intensity.
 */
Effect.ShadersStore.proceduralKeycapGlowFragmentShader = `
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

// Keycap-specific uniforms
uniform float matchProgress;   // 0.0 (no match) to 1.0 (fully matched)
uniform vec3 glowColor;        // per-keycap glow color

void main(void) {
  // Base keycap color (dark surface)
  vec3 keycapBase = baseColor * 0.3;

  // Glow intensity driven by match progress with pulsation
  float pulse = sin(time * 4.0) * 0.15 + 0.85;
  float glowIntensity = matchProgress * pulse;

  // Letter region approximation (center UV region brighter)
  float letterMask = smoothstep(0.7, 0.3, length(vUV - 0.5) * 2.0);

  // Emissive glow color
  vec3 emissive = glowColor * glowIntensity * letterMask;

  // LED underglow: bottom edge glow effect
  float underglow = smoothstep(0.8, 1.0, vUV.y); // bottom 20% of keycap
  underglow *= matchProgress; // only shows when key is active
  vec3 ledColor = glowColor * underglow * 2.0; // bright LED
  // Blur approximation: extend glow slightly beyond edge
  float glowSpread = smoothstep(0.6, 1.0, vUV.y) * matchProgress * 0.5;
  vec3 spreadGlow = glowColor * glowSpread;

  // Combine
  vec3 finalColor = keycapBase + emissive + ledColor + spreadGlow;

  // Corruption noise on keycaps
  float corrupt = corruptionLevel * sin(vUV.x * 50.0 + time) * 0.1;
  finalColor += vec3(corrupt, 0.0, 0.0);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ===========================================================================
// 10. Mechanical Crack (fragment only) — PBR normal map crack propagation
// ===========================================================================

/**
 * Mechanical Crack Fragment Shader (GLSL)
 *
 * Generates crack patterns from Voronoi distance field:
 *   float crack = smoothstep(0.02, 0.0, voronoiDist);
 * Used by MechanicalDegradationSystem for platter degradation.
 */
Effect.ShadersStore.mechanicalCrackFragmentShader = `
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

// Hash for Voronoi
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// Voronoi distance field
float voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.5 * sin(time * 0.5 + 6.28318530718 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      minDist = min(minDist, d);
    }
  }
  return sqrt(minDist);
}

void main(void) {
  // Scale UV for crack pattern density
  vec2 crackUV = vUV * 8.0;
  float voronoiDist = voronoi(crackUV);

  // Crack line: sharp edge from Voronoi
  float crack = smoothstep(0.02, 0.0, voronoiDist);

  // Tension drives crack visibility (cracks appear above 0.3)
  float crackVisibility = smoothstep(0.3, 0.8, tension);
  crack *= crackVisibility;

  // Base platter surface
  vec3 surfaceColor = baseColor;

  // Crack color (dark with red emissive edges)
  vec3 crackColor = vec3(0.1, 0.0, 0.0);
  vec3 crackGlow = vec3(1.0, 0.2, 0.0) * crack * corruptionLevel;

  // Combine
  vec3 finalColor = mix(surfaceColor, crackColor, crack);
  finalColor += crackGlow;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ===========================================================================
// 11. Echo Ghost (vertex + fragment) — Ghost keycap with scan-line effect
// ===========================================================================

/**
 * Echo Ghost Vertex Shader (GLSL)
 *
 * Sine-wave ripple vertex displacement for ghostly distortion.
 * Used by EchoSystem for ghost keycap replays.
 */
Effect.ShadersStore.echoGhostVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float time;
uniform float distortAmount;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;

void main(void) {
  // Apply vertex displacement: sine-wave ripple along Y axis
  vec3 displaced = position;
  float wave = sin(position.y * 20.0 + time * 4.0) * distortAmount;
  displaced.x += normal.x * wave;
  displaced.z += normal.z * wave;

  gl_Position = worldViewProjection * vec4(displaced, 1.0);
  vPositionW = vec3(world * vec4(displaced, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
}
`;

/**
 * Echo Ghost Fragment Shader (GLSL)
 *
 * Scan-line transparency + Fresnel edge glow for ghost keycaps.
 * Used by EchoSystem for ghost keycap replays with 1800ms auto-dispose.
 */
Effect.ShadersStore.echoGhostFragmentShader = `
precision highp float;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;

// Uniforms
uniform float time;
uniform float alpha;
uniform vec3 glowColor;

void main(void) {
  // Scan-line transparency effect
  float scanLine = sin(vPositionW.y * 80.0 + time * 6.0) * 0.5 + 0.5;
  float scanAlpha = alpha * mix(0.3, 1.0, scanLine);

  // Fresnel edge glow
  vec3 viewDir = normalize(vPositionW);
  float fresnel = pow(1.0 - abs(dot(normalize(viewDir), vNormalW)), 2.0);
  vec3 finalColor = glowColor + glowColor * fresnel * 0.5;

  gl_FragColor = vec4(finalColor, scanAlpha);
}
`;

// ===========================================================================
// 12. Coherence Ring Fill (vertex + fragment) — Ring fill arc animation
// ===========================================================================

/**
 * Coherence Ring Fill Vertex Shader (GLSL)
 *
 * Standard vertex pass-through for ring torus mesh.
 */
Effect.ShadersStore.coherenceRingFillVertexShader = `
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
  gl_Position = worldViewProjection * vec4(position, 1.0);
  vPositionW = vec3(world * vec4(position, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
}
`;

/**
 * Coherence Ring Fill Fragment Shader (GLSL)
 *
 * Animates fill arc from 0 to 2*PI based on coherenceLevel uniform.
 * Color transitions: blue (safe) -> red (danger) with tension.
 */
Effect.ShadersStore.coherenceRingFillFragmentShader = `
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

// Ring-specific uniforms
uniform float coherenceLevel; // 0.0 to 1.0 (maps to 0 -> 2*PI arc)

void main(void) {
  // Convert UV to polar coordinates (centered)
  vec2 centered = vUV - 0.5;
  float angle = atan(centered.y, centered.x) + 3.14159265359; // 0 to 2*PI
  float radius = length(centered) * 2.0;

  // Ring mask (annulus)
  float ringMask = smoothstep(0.85, 0.9, radius) * smoothstep(1.0, 0.95, radius);

  // Fill arc from 0 to coherenceLevel * 2*PI
  float fillAngle = coherenceLevel * 6.28318530718;
  float fillMask = step(angle, fillAngle);

  // Color interpolation: blue (safe) -> red (danger)
  vec3 fillColor = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.2, 0.1), tension);

  // Glow pulse on the leading edge
  float edgeGlow = smoothstep(fillAngle - 0.1, fillAngle, angle) * fillMask;
  vec3 glowColor = fillColor + vec3(0.3) * edgeGlow;

  // Combine
  vec3 finalColor = glowColor * ringMask * fillMask;
  float alpha = ringMask * fillMask * 0.9;

  // Unfilled ring portion is dim
  vec3 unfilled = vec3(0.1, 0.1, 0.15) * ringMask * (1.0 - fillMask);
  finalColor += unfilled;
  alpha += ringMask * (1.0 - fillMask) * 0.3;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ===========================================================================
// 13. Dust Particle (vertex + fragment) — Keycap emergence dust
// ===========================================================================

/**
 * Dust Particle Vertex Shader (GLSL)
 *
 * Billboard quad with animated opacity and seed-derived drift.
 */
Effect.ShadersStore.dustParticleVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float time;
uniform float tension;

// Particle-specific uniforms
uniform vec3 driftDirection; // seed-derived drift vector
uniform float particleAge;  // 0.0 (spawn) to 1.0 (expired)

// Varyings
varying vec2 vUV;
varying float vAge;

void main(void) {
  // Billboard quad with drift and gravity
  vec3 drifted = position;
  drifted += driftDirection * particleAge * 0.5;
  drifted.y -= particleAge * particleAge * 0.3; // gravity falloff

  vec4 outPosition = worldViewProjection * vec4(drifted, 1.0);
  gl_Position = outPosition;

  vUV = uv;
  vAge = particleAge;
}
`;

/**
 * Dust Particle Fragment Shader (GLSL)
 *
 * Circular particle with age-based opacity fade.
 */
Effect.ShadersStore.dustParticleFragmentShader = `
precision highp float;

// Varyings
varying vec2 vUV;
varying float vAge;

// Common uniforms
uniform float tension;
uniform float time;
uniform float corruptionLevel;
uniform vec3 baseColor;
uniform float deviceQualityLOD;

void main(void) {
  // Circular particle shape
  float dist = length(vUV - 0.5) * 2.0;
  float shape = smoothstep(1.0, 0.6, dist);

  // Opacity fades over lifetime
  float alpha = shape * (1.0 - vAge);

  // Warm dust color
  vec3 dustColor = mix(baseColor, vec3(0.9, 0.7, 0.4), 0.5);

  gl_FragColor = vec4(dustColor, alpha * 0.6);
}
`;

// ===========================================================================
// 14. Shatter Shard (vertex + fragment) — Glass shard refraction + gravity
// ===========================================================================

/**
 * Shatter Shard Vertex Shader (GLSL)
 *
 * Glass shard with seed-derived rotation and gravity-affected position.
 */
Effect.ShadersStore.shatterShardVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float time;
uniform float tension;

// Shard-specific uniforms
uniform vec3 shardVelocity;   // initial explosion velocity
uniform vec3 shardRotation;   // seed-derived rotation axis
uniform float shatterTime;    // time since shatter began

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
  // Gravity-affected position
  vec3 displaced = position;
  displaced += shardVelocity * shatterTime;
  displaced.y -= 4.9 * shatterTime * shatterTime; // half gravity

  // Seed-derived rotation via Rodrigues formula
  float angle = shatterTime * 3.0;
  float cosA = cos(angle);
  float sinA = sin(angle);
  vec3 axis = normalize(shardRotation);
  displaced = displaced * cosA + cross(axis, displaced) * sinA + axis * dot(axis, displaced) * (1.0 - cosA);

  vec4 outPosition = worldViewProjection * vec4(displaced, 1.0);
  gl_Position = outPosition;

  vPositionW = vec3(world * vec4(displaced, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
}
`;

/**
 * Shatter Shard Fragment Shader (GLSL)
 *
 * Glass shard with refraction, Fresnel rim, and time-based fade.
 */
Effect.ShadersStore.shatterShardFragmentShader = `
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

// Shard-specific uniforms
uniform float shatterTime;

void main(void) {
  // Refraction through glass shard
  vec3 viewDir = normalize(cameraPosition - vPositionW);
  vec3 refracted = refract(-viewDir, vNormalW, 1.0 / 1.52);

  // Glass color with refraction tint
  vec3 glassColor = baseColor * 0.8 + vec3(0.1, 0.15, 0.2);
  glassColor += refracted * 0.1;

  // Fresnel rim
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormalW)), 2.0);
  glassColor += vec3(0.5, 0.7, 1.0) * fresnel * 0.4;

  // Fade over time after shatter
  float fadeAlpha = 1.0 - smoothstep(1.0, 3.0, shatterTime);

  gl_FragColor = vec4(glassColor, fadeAlpha * 0.8);
}
`;

// ===========================================================================
// 15. Morph Transition (vertex only) — Enemy morph interpolation
// ===========================================================================

/**
 * Morph Transition Vertex Shader (GLSL)
 *
 * Interpolates between base sphere and trait-specific vertex positions
 * using morphProgress uniform (0.0 = base sphere, 1.0 = trait shape).
 */
Effect.ShadersStore.morphTransitionVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Morph target attributes
attribute vec3 positionTarget;
attribute vec3 normalTarget;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float tension;
uniform float time;
uniform float morphProgress; // 0.0 (base sphere) to 1.0 (trait-specific shape)

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
  // Interpolate between base and target vertex positions
  vec3 morphedPos = mix(position, positionTarget, morphProgress);
  vec3 morphedNormal = normalize(mix(normal, normalTarget, morphProgress));

  vec4 outPosition = worldViewProjection * vec4(morphedPos, 1.0);
  gl_Position = outPosition;

  vPositionW = vec3(world * vec4(morphedPos, 1.0));
  vNormalW = normalize(vec3(world * vec4(morphedNormal, 0.0)));
  vUV = uv;
}
`;

// ===========================================================================
// 16. Platter Surface (fragment only) — Brushed metal + micro-scratches
// ===========================================================================

/**
 * Platter Surface Fragment Shader (GLSL)
 *
 * Detailed platter surface with procedural brushed metal normal map,
 * micro-scratches, and subtle grime texture.
 */
Effect.ShadersStore.platterSurfaceFragmentShader = `
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

// Hash function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main(void) {
  // Brushed metal: directional noise along one axis
  float brushedNoise = hash(vec2(vUV.x * 200.0, floor(vUV.y * 40.0)));
  float brushedMetal = 0.8 + brushedNoise * 0.2;

  // Micro-scratches (high-frequency detail)
  float scratch = hash(vUV * 500.0);
  scratch = smoothstep(0.97, 1.0, scratch) * 0.3;

  // Subtle grime (low-frequency noise)
  float grime = hash(floor(vUV * 10.0));
  grime = smoothstep(0.6, 0.8, grime) * 0.1;

  // Base metal color with brushed pattern
  vec3 metalColor = baseColor * brushedMetal;

  // Add scratch highlights
  metalColor += vec3(scratch);

  // Subtract grime darkening
  metalColor *= 1.0 - grime;

  // Tension drives surface darkening (wear)
  metalColor *= 1.0 - tension * 0.15;

  // Corruption adds red tint to scratches
  metalColor += vec3(1.0, 0.0, 0.0) * scratch * corruptionLevel;

  gl_FragColor = vec4(metalColor, 1.0);
}
`;

// ===========================================================================
// 17. Lever Mechanical (vertex + fragment) — Joint articulation + wear marks
// ===========================================================================

/**
 * Lever Mechanical Vertex Shader (GLSL)
 *
 * Joint articulation with leverAngle rotation around pivotPoint.
 */
Effect.ShadersStore.leverMechanicalVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float tension;
uniform float time;

// Lever-specific uniforms
uniform float leverAngle;    // current lever rotation angle
uniform vec3 pivotPoint;     // joint pivot position

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
  // Joint articulation: rotate around pivot
  vec3 relPos = position - pivotPoint;
  float cosA = cos(leverAngle);
  float sinA = sin(leverAngle);
  vec3 rotated;
  rotated.x = relPos.x;
  rotated.y = relPos.y * cosA - relPos.z * sinA;
  rotated.z = relPos.y * sinA + relPos.z * cosA;
  vec3 finalPos = rotated + pivotPoint;

  vec4 outPosition = worldViewProjection * vec4(finalPos, 1.0);
  gl_Position = outPosition;

  vPositionW = vec3(world * vec4(finalPos, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
}
`;

/**
 * Lever Mechanical Fragment Shader (GLSL)
 *
 * Metallic lever surface with wear marks near pivot and heat redness from tension.
 */
Effect.ShadersStore.leverMechanicalFragmentShader = `
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

// Hash function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main(void) {
  // Metallic lever surface
  vec3 leverColor = baseColor;

  // Wear marks near pivot (UV.y < 0.2 = joint area)
  float wearZone = smoothstep(0.2, 0.0, vUV.y);
  float wearNoise = hash(vUV * 100.0);
  float wearMarks = wearZone * smoothstep(0.6, 0.8, wearNoise) * 0.4;

  // Darkened worn areas
  leverColor *= 1.0 - wearMarks;

  // Metallic highlight
  float highlight = pow(max(0.0, dot(vNormalW, vec3(0.0, 1.0, 0.0))), 4.0);
  leverColor += vec3(0.2) * highlight;

  // Tension drives lever redness (heat from friction)
  leverColor = mix(leverColor, vec3(0.8, 0.2, 0.0), tension * 0.1);

  gl_FragColor = vec4(leverColor, 1.0);
}
`;

// ===========================================================================
// 18. Sphere Breathing (vertex only) — Dedicated breathing displacement
// ===========================================================================

/**
 * Sphere Breathing Vertex Shader (GLSL)
 *
 * Dedicated breathing vertex displacement:
 *   position *= 1.0 + sin(time * 1.8 * 6.28) * tension * 0.03;
 */
Effect.ShadersStore.sphereBreathingVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float tension;
uniform float time;

// Varyings
varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;

void main(void) {
  // Breathing displacement: position *= 1.0 + sin(time * 1.8 * 6.28) * tension * 0.03
  float breathe = sin(time * 1.8 * 6.28318530718) * tension * 0.03;
  vec3 displaced = position * (1.0 + breathe);

  vec4 outPosition = worldViewProjection * vec4(displaced, 1.0);
  gl_Position = outPosition;

  vPositionW = vec3(world * vec4(displaced, 1.0));
  vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
  vUV = uv;
}
`;

// ===========================================================================
// 19. Tensor Field (fragment only) — Tension field streamline visualization
// ===========================================================================

/**
 * Tensor Field Fragment Shader (GLSL)
 *
 * Visualization of tension field as colored streamlines around sphere.
 */
Effect.ShadersStore.tensorFieldFragmentShader = `
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

// Hash function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main(void) {
  // Streamline field visualization
  vec2 fieldUV = vUV * 10.0;
  float angle = hash(floor(fieldUV)) * 6.28318530718;
  vec2 flowDir = vec2(cos(angle), sin(angle));

  // Animated streamline
  float stream = sin(dot(fieldUV, flowDir) * 5.0 - time * 2.0);
  stream = smoothstep(0.8, 1.0, stream);

  // Tension drives stream density and brightness
  float streamBrightness = stream * tension;

  // Color: blue for low tension, red for high
  vec3 streamColor = mix(vec3(0.2, 0.4, 1.0), vec3(1.0, 0.2, 0.1), tension);
  vec3 finalColor = streamColor * streamBrightness;

  // Background is near-transparent
  float alpha = streamBrightness * 0.8;

  // Corruption adds noise to streamlines
  float corruptNoise = hash(vUV * 50.0 + vec2(time * 0.1)) * corruptionLevel * 0.2;
  finalColor += vec3(corruptNoise, 0.0, 0.0);
  alpha += corruptNoise * 0.3;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ===========================================================================
// 20. Glass Refraction (fragment only) — Sphere glass IOR 1.52 + caustics
// ===========================================================================

/**
 * Glass Refraction Fragment Shader (GLSL)
 *
 * Sphere glass refraction with IOR 1.52 and caustic approximation.
 */
Effect.ShadersStore.glassRefractionFragmentShader = `
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

// Crack-specific uniform
uniform float crackProgress; // 0.0 (intact) to 1.0 (fully cracked)

// Voronoi-based crack pattern
vec2 crackHash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float crackPattern(vec2 uv, float density) {
  vec2 n = floor(uv * density);
  vec2 f = fract(uv * density);
  float minDist = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = crackHash2(n + g);
      vec2 r = g + o - f;
      float d = length(r);
      minDist = min(minDist, d);
    }
  }
  // Sharp crack lines from Voronoi edges
  return smoothstep(0.02, 0.0, minDist);
}

void main(void) {
  vec3 viewDir = normalize(cameraPosition - vPositionW);
  vec3 normal = normalize(vNormalW);

  // Refraction with IOR 1.52 (crown glass)
  vec3 refracted = refract(-viewDir, normal, 1.0 / 1.52);

  // Caustic approximation: focused light pattern
  float caustic = pow(max(0.0, dot(refracted, vec3(0.0, -1.0, 0.0))), 8.0);
  caustic *= sin(vUV.x * 20.0 + time * 0.5) * sin(vUV.y * 20.0 + time * 0.3) * 0.5 + 0.5;

  // Fresnel reflection
  float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 4.0);

  // Glass body color with refraction tint
  vec3 glassColor = baseColor * 0.6;
  glassColor += refracted * 0.05; // subtle refraction color shift
  glassColor += vec3(1.0, 0.95, 0.9) * caustic * 0.3; // caustic bright spots

  // Reflection at edges
  glassColor += vec3(0.8, 0.9, 1.0) * fresnel * 0.5;

  // Tension tints glass warmer
  glassColor = mix(glassColor, vec3(1.0, 0.6, 0.3), tension * 0.15);

  // Corruption adds micro-fracture speckling
  float speckle = step(0.99, fract(sin(dot(vUV * 200.0, vec2(12.9898, 78.233))) * 43758.5453));
  glassColor += vec3(speckle) * corruptionLevel * 0.3;

  // Crack overlay (driven by crackProgress)
  if (crackProgress > 0.0) {
    float crack = crackPattern(vUV, 8.0) * crackProgress;
    // Crack lines glow white-blue
    vec3 crackGlow = vec3(0.8, 0.9, 1.0) * crack * 2.0;
    glassColor += crackGlow;
    // Darken glass body slightly where cracked
    glassColor *= 1.0 - crack * 0.3;
  }

  gl_FragColor = vec4(glassColor, 0.75 + fresnel * 0.2);
}
`;

// ===========================================================================
// 21. Enemy Trail (vertex + fragment) — Trailing particle behind enemies
// ===========================================================================

/**
 * Enemy Trail Vertex Shader (GLSL)
 *
 * Trail stretches opposite to velocity with slight organic oscillation.
 */
Effect.ShadersStore.enemyTrailVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float time;
uniform float tension;

// Trail-specific uniforms
uniform vec3 trailVelocity;  // enemy movement direction
uniform float trailAge;      // 0.0 (fresh) to 1.0 (faded)

// Varyings
varying vec2 vUV;
varying float vAge;

void main(void) {
  // Trail stretches opposite to velocity
  vec3 trailPos = position;
  trailPos -= normalize(trailVelocity + vec3(0.001)) * uv.y * 0.5 * (1.0 - trailAge);

  // Slight oscillation for organic feel
  trailPos.x += sin(time * 3.0 + position.y * 5.0) * 0.003 * tension;

  vec4 outPosition = worldViewProjection * vec4(trailPos, 1.0);
  gl_Position = outPosition;

  vUV = uv;
  vAge = trailAge;
}
`;

/**
 * Enemy Trail Fragment Shader (GLSL)
 *
 * Neon trail color with taper and age-based fade.
 */
Effect.ShadersStore.enemyTrailFragmentShader = `
precision highp float;

// Varyings
varying vec2 vUV;
varying float vAge;

// Common uniforms
uniform float tension;
uniform float time;
uniform float corruptionLevel;
uniform vec3 baseColor;
uniform float deviceQualityLOD;

// Trail-specific
uniform vec3 traitColor;

void main(void) {
  // Trail shape (tapers along V axis)
  float width = smoothstep(0.0, 0.1, vUV.x) * smoothstep(1.0, 0.9, vUV.x);
  float taper = 1.0 - vUV.y;

  // Opacity fades with age
  float alpha = width * taper * (1.0 - vAge) * 0.7;

  // Neon trail color
  vec3 trailColor = traitColor * (0.8 + sin(time * 5.0 + vUV.y * 10.0) * 0.2);

  // Corruption shifts trail color toward red
  trailColor = mix(trailColor, vec3(1.0, 0.1, 0.0), corruptionLevel * 0.3);

  gl_FragColor = vec4(trailColor, alpha);
}
`;

// ===========================================================================
// 22. Rim Highlight (fragment only) — Platter rim edge intensifies with tension
// ===========================================================================

/**
 * Rim Highlight Fragment Shader (GLSL)
 *
 * Platter rim edge highlight that intensifies with tension.
 * View-dependent Fresnel with blue->red color transition.
 */
Effect.ShadersStore.rimHighlightFragmentShader = `
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

void main(void) {
  // Rim detection via view-dependent Fresnel
  vec3 viewDir = normalize(cameraPosition - vPositionW);
  float rim = pow(1.0 - abs(dot(viewDir, vNormalW)), 3.0);

  // Rim color: blue at low tension, red at high tension
  vec3 rimColor = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.3, 0.1), tension);

  // Intensity scales with tension
  float rimIntensity = rim * (0.2 + tension * 0.8);

  // Pulsation at high tension
  float pulse = 1.0;
  if (tension > 0.5) {
    pulse = 0.8 + sin(time * 4.0) * 0.2 * (tension - 0.5) * 2.0;
  }

  // Base platter surface
  vec3 surfaceColor = baseColor;
  vec3 finalColor = surfaceColor + rimColor * rimIntensity * pulse;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ===========================================================================
// 23. Ambient Corruption (vertex + fragment) — Full-screen corruption overlay
// ===========================================================================

/**
 * Ambient Corruption Vertex Shader (GLSL)
 *
 * Full-screen quad pass-through for post-process overlay.
 */
Effect.ShadersStore.ambientCorruptionVertexShader = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec2 uv;

// Varyings
varying vec2 vUV;

void main(void) {
  gl_Position = vec4(position, 1.0);
  vUV = uv;
}
`;

/**
 * Ambient Corruption Fragment Shader (GLSL)
 *
 * Full-screen subtle corruption overlay that increases with tension.
 * Includes scan lines, chromatic aberration, film grain, and vignette.
 */
Effect.ShadersStore.ambientCorruptionFragmentShader = `
precision highp float;

// Varyings
varying vec2 vUV;

// Common uniforms
uniform float tension;
uniform float time;
uniform float corruptionLevel;
uniform vec3 baseColor;
uniform float deviceQualityLOD;

// Post-process uniforms
uniform sampler2D textureSampler;

// Hash function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Tanh tone mapping for atmospheric clamping (reference: xordev ATC shader)
vec3 tanhToneMap(vec3 x) {
  vec3 e2x = exp(2.0 * x);
  return (e2x - 1.0) / (e2x + 1.0);
}

void main(void) {
  vec4 sceneColor = texture2D(textureSampler, vUV);

  // Subtle scan lines
  float scanLine = sin(vUV.y * 400.0 + time * 2.0) * 0.5 + 0.5;
  scanLine = smoothstep(0.4, 0.6, scanLine);
  float scanEffect = scanLine * corruptionLevel * 0.05;

  // Chromatic aberration (increases with tension)
  float chromaShift = corruptionLevel * 0.003;
  float r = texture2D(textureSampler, vUV + vec2(chromaShift, 0.0)).r;
  float b = texture2D(textureSampler, vUV - vec2(chromaShift, 0.0)).b;
  vec3 chromatic = vec3(r, sceneColor.g, b);

  // Mix between original and chromatic based on corruption
  vec3 finalColor = mix(sceneColor.rgb, chromatic, corruptionLevel);

  // Scan line overlay
  finalColor -= vec3(scanEffect);

  // Random noise grain
  float grain = hash(vUV * 200.0 + vec2(time)) * corruptionLevel * 0.04;
  finalColor += vec3(grain);

  // Subtle vignette that increases with tension
  float vignette = length(vUV - 0.5) * 1.4;
  vignette = smoothstep(0.5, 1.2, vignette) * tension * 0.2;
  finalColor *= 1.0 - vignette;

  // Apply subtle tanh tone mapping when corruption is active
  finalColor = mix(finalColor, tanhToneMap(finalColor * 1.5), corruptionLevel * 0.4);

  gl_FragColor = vec4(finalColor, sceneColor.a);
}
`;

// ===========================================================================
// Registry initialization
// ===========================================================================

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
