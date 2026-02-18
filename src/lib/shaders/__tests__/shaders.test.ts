import * as BABYLON from '@babylonjs/core';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Shader factory tests.
 *
 * We test that the factories correctly populate BABYLON.Effect.ShadersStore
 * with the expected GLSL strings. The factories ALSO call `new ShaderMaterial`,
 * which needs a real scene — but the ShadersStore population happens BEFORE
 * the constructor call, so we can check it even if the constructor throws.
 */

describe('shader factories', () => {
  beforeEach(() => {
    // Clear ShadersStore between tests
    for (const key of Object.keys(BABYLON.Effect.ShadersStore)) {
      delete BABYLON.Effect.ShadersStore[key];
    }
  });

  describe('celestial shader', () => {
    it('registers vertex and fragment shaders in ShadersStore', async () => {
      const { createCelestialShaderMaterial } = await import('../celestial');
      try {
        createCelestialShaderMaterial({} as BABYLON.Scene);
      } catch {
        // ShaderMaterial constructor may throw without real scene — that's OK
      }

      expect(BABYLON.Effect.ShadersStore['celestialVertexShader']).toBeDefined();
      expect(BABYLON.Effect.ShadersStore['celestialFragmentShader']).toBeDefined();
      expect(BABYLON.Effect.ShadersStore['celestialVertexShader']).toContain('worldViewProjection');
      expect(BABYLON.Effect.ShadersStore['celestialFragmentShader']).toContain('u_time');
      expect(BABYLON.Effect.ShadersStore['celestialFragmentShader']).toContain('fbm');
    });
  });

  describe('neon-raymarcher shader', () => {
    it('registers vertex and fragment shaders in ShadersStore', async () => {
      const { createNeonRaymarcherMaterial } = await import('../neon-raymarcher');
      try {
        createNeonRaymarcherMaterial({} as BABYLON.Scene);
      } catch {
        // Expected
      }

      expect(BABYLON.Effect.ShadersStore['neonVertexShader']).toBeDefined();
      expect(BABYLON.Effect.ShadersStore['neonFragmentShader']).toBeDefined();
      expect(BABYLON.Effect.ShadersStore['neonFragmentShader']).toContain('sdBox');
      expect(BABYLON.Effect.ShadersStore['neonFragmentShader']).toContain('opSmoothUnion');
    });
  });

  describe('crystalline-cube shader', () => {
    it('registers vertex and fragment shaders in ShadersStore', async () => {
      const { createCrystallineCubeMaterial } = await import('../crystalline-cube');
      try {
        createCrystallineCubeMaterial({} as BABYLON.Scene);
      } catch {
        // Expected
      }

      expect(BABYLON.Effect.ShadersStore['crystallineVertexShader']).toBeDefined();
      expect(BABYLON.Effect.ShadersStore['crystallineFragmentShader']).toBeDefined();
      expect(BABYLON.Effect.ShadersStore['crystallineFragmentShader']).toContain('palette');
      expect(BABYLON.Effect.ShadersStore['crystallineFragmentShader']).toContain('rayMarch');
    });
  });
});
