/**
 * Custom GLSL Shaders — Iridescent Thin-Film & Heat Distortion
 *
 * Provides physically-based thin-film interference for enemy bubbles
 * and heat distortion vertex displacement for boss/character effects.
 *
 * These shaders run on WebGL2 and are structured for future WebGPU
 * migration via Three.js TSL (Three Shading Language).
 */

import * as THREE from 'three';

/**
 * Iridescent bubble material using MeshPhysicalMaterial with onBeforeCompile
 * to inject thin-film interference calculations into the fragment shader.
 *
 * Creates a soap-bubble-like rainbow sheen that shifts with view angle.
 */
export function createIridescentMaterial(baseColor: string): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.6,
    thickness: 0.5,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.85,
    envMapIntensity: 1.2,
    side: THREE.FrontSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uIridescenceStrength = { value: 0.4 };

    // Inject thin-film interference into fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uTime;
      uniform float uIridescenceStrength;

      // Thin-film interference: wavelength-dependent reflection
      vec3 thinFilmInterference(float cosTheta, float thickness) {
        float delta = 2.0 * thickness * cosTheta;
        // Approximate spectral decomposition into RGB channels
        float r = 0.5 + 0.5 * cos(6.2832 * (delta / 0.650 + 0.0));  // Red ~650nm
        float g = 0.5 + 0.5 * cos(6.2832 * (delta / 0.550 + 0.33)); // Green ~550nm
        float b = 0.5 + 0.5 * cos(6.2832 * (delta / 0.450 + 0.67)); // Blue ~450nm
        return vec3(r, g, b);
      }
      `
    );

    // Apply iridescence to the final color output
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      // Compute view-dependent iridescence
      vec3 viewDir = normalize(vViewPosition);
      float cosTheta = abs(dot(normalize(vNormal), viewDir));
      float filmThickness = 0.3 + 0.2 * sin(uTime * 0.5);
      vec3 iridescence = thinFilmInterference(cosTheta, filmThickness);

      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * iridescence * 1.5, uIridescenceStrength);

      #include <dithering_fragment>
      `
    );
  };

  // Store the material reference for time updates
  (mat as unknown as Record<string, unknown>).__iridescent = true;

  return mat;
}

/**
 * Boss distortion material — vertex displacement for heat-haze effect.
 * Applies sinusoidal displacement to vertices, creating a warping aura.
 */
export function createDistortionMaterial(baseColor: string): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness: 0.2,
    metalness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uDistortionStrength = { value: 0.05 };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uTime;
      uniform float uDistortionStrength;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      // Sinusoidal vertex displacement — heat shimmer effect
      float wave = sin(position.y * 10.0 + uTime * 3.0) * cos(position.x * 8.0 + uTime * 2.5);
      transformed += normal * wave * uDistortionStrength;
      `
    );
  };

  (mat as unknown as Record<string, unknown>).__distortion = true;

  return mat;
}

/**
 * Crystalline faceted material for boss geometry.
 * Uses high clearcoat with low roughness for gem-like appearance.
 */
export function createCrystallineMaterial(baseColor: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    transmission: 0.3,
    thickness: 1.0,
    ior: 2.0,
    envMapIntensity: 1.5,
    emissive: baseColor,
    emissiveIntensity: 0.2,
  });
}
