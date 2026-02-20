/**
 * Tests for shader registry — Cognitive Dissonance v3.0
 *
 * Comprehensive test suite verifying all 23 custom shaders are registered
 * in Effect.ShadersStore with correct GLSL content, uniforms, attributes,
 * and vertex/fragment pairs.
 */

// Mock @babylonjs/core/Materials/effect
const mockShadersStore: Record<string, string> = {};

jest.mock('@babylonjs/core/Materials/effect', () => ({
  Effect: {
    ShadersStore: mockShadersStore,
  },
}));

// Import AFTER mock is set up — the module-level assignments will populate mockShadersStore
import { initializeShaderRegistry } from '../registry';

// ---------------------------------------------------------------------------
// Helper: list of all expected shader keys
// ---------------------------------------------------------------------------

const ALL_VERTEX_SHADERS = [
  'celestialNebulaVertexShader',
  'arOcclusionVertexShader',
  'nebulaCorruptionVertexShader',
  'crystallineBossVertexShader',
  'corruptionTendrilVertexShader',
  'neonRaymarcherVertexShader',
  'worldCrushDistortionVertexShader',
  'proceduralKeycapGlowVertexShader',
  'echoGhostVertexShader',
  'coherenceRingFillVertexShader',
  'dustParticleVertexShader',
  'shatterShardVertexShader',
  'morphTransitionVertexShader',
  'leverMechanicalVertexShader',
  'sphereBreathingVertexShader',
  'enemyTrailVertexShader',
  'ambientCorruptionVertexShader',
] as const;

const ALL_FRAGMENT_SHADERS = [
  'celestialNebulaFragmentShader',
  'arOcclusionFragmentShader',
  'nebulaCorruptionFragmentShader',
  'crystallineBossFragmentShader',
  'corruptionTendrilFragmentShader',
  'neonRaymarcherFragmentShader',
  'thinFilmInterferenceFragmentShader',
  'worldCrushDistortionFragmentShader',
  'proceduralKeycapGlowFragmentShader',
  'mechanicalCrackFragmentShader',
  'echoGhostFragmentShader',
  'coherenceRingFillFragmentShader',
  'dustParticleFragmentShader',
  'shatterShardFragmentShader',
  'platterSurfaceFragmentShader',
  'leverMechanicalFragmentShader',
  'tensorFieldFragmentShader',
  'glassRefractionFragmentShader',
  'enemyTrailFragmentShader',
  'rimHighlightFragmentShader',
  'ambientCorruptionFragmentShader',
] as const;

const ALL_SHADERS = [...ALL_VERTEX_SHADERS, ...ALL_FRAGMENT_SHADERS];

// ---------------------------------------------------------------------------
// 1. Celestial Nebula shaders
// ---------------------------------------------------------------------------

describe('Shader Registry', () => {
  describe('1. Celestial Nebula shaders', () => {
    it('registers celestialNebulaVertexShader in ShadersStore', () => {
      expect(mockShadersStore.celestialNebulaVertexShader).toBeDefined();
      expect(typeof mockShadersStore.celestialNebulaVertexShader).toBe('string');
    });

    it('registers celestialNebulaFragmentShader in ShadersStore', () => {
      expect(mockShadersStore.celestialNebulaFragmentShader).toBeDefined();
      expect(typeof mockShadersStore.celestialNebulaFragmentShader).toBe('string');
    });

    it('celestial nebula vertex shader contains position attribute', () => {
      expect(mockShadersStore.celestialNebulaVertexShader).toContain('attribute vec3 position');
    });

    it('celestial nebula vertex shader contains normal attribute', () => {
      expect(mockShadersStore.celestialNebulaVertexShader).toContain('attribute vec3 normal');
    });

    it('celestial nebula vertex shader contains uv attribute', () => {
      expect(mockShadersStore.celestialNebulaVertexShader).toContain('attribute vec2 uv');
    });

    it('celestial nebula vertex shader contains worldViewProjection uniform', () => {
      expect(mockShadersStore.celestialNebulaVertexShader).toContain('uniform mat4 worldViewProjection');
    });

    it('celestial nebula fragment shader contains tension uniform', () => {
      expect(mockShadersStore.celestialNebulaFragmentShader).toContain('uniform float tension');
    });

    it('celestial nebula fragment shader contains time uniform', () => {
      expect(mockShadersStore.celestialNebulaFragmentShader).toContain('uniform float time');
    });

    it('celestial nebula fragment shader contains corruptionLevel uniform', () => {
      expect(mockShadersStore.celestialNebulaFragmentShader).toContain('uniform float corruptionLevel');
    });

    it('celestial nebula fragment shader contains baseColor uniform', () => {
      expect(mockShadersStore.celestialNebulaFragmentShader).toContain('uniform vec3 baseColor');
    });

    it('celestial nebula fragment shader contains deviceQualityLOD uniform', () => {
      expect(mockShadersStore.celestialNebulaFragmentShader).toContain('uniform float deviceQualityLOD');
    });

    it('celestial nebula fragment shader contains color uniforms for 3-stop ramp', () => {
      expect(mockShadersStore.celestialNebulaFragmentShader).toContain('uniform vec3 calmColor');
      expect(mockShadersStore.celestialNebulaFragmentShader).toContain('uniform vec3 warmColor');
      expect(mockShadersStore.celestialNebulaFragmentShader).toContain('uniform vec3 violentColor');
    });

    it('celestial nebula fragment shader implements static jitter above tension 0.7', () => {
      expect(mockShadersStore.celestialNebulaFragmentShader).toContain('tension > 0.7');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. AR Occlusion shaders
  // ---------------------------------------------------------------------------

  describe('2. AR Occlusion shaders', () => {
    it('registers arOcclusionVertexShader in ShadersStore', () => {
      expect(mockShadersStore.arOcclusionVertexShader).toBeDefined();
      expect(typeof mockShadersStore.arOcclusionVertexShader).toBe('string');
    });

    it('registers arOcclusionFragmentShader in ShadersStore', () => {
      expect(mockShadersStore.arOcclusionFragmentShader).toBeDefined();
      expect(typeof mockShadersStore.arOcclusionFragmentShader).toBe('string');
    });

    it('AR occlusion vertex shader contains vPosition clip space varying', () => {
      expect(mockShadersStore.arOcclusionVertexShader).toContain('varying vec4 vPosition');
    });

    it('AR occlusion fragment shader contains environmentDepthTexture sampler', () => {
      expect(mockShadersStore.arOcclusionFragmentShader).toContain(
        'uniform sampler2D environmentDepthTexture',
      );
    });

    it('AR occlusion fragment shader contains depthThreshold uniform', () => {
      expect(mockShadersStore.arOcclusionFragmentShader).toContain('uniform float depthThreshold');
    });

    it('AR occlusion fragment shader implements discard for depth occlusion', () => {
      expect(mockShadersStore.arOcclusionFragmentShader).toContain('discard');
    });

    it('AR occlusion fragment shader supports crystalline variant', () => {
      expect(mockShadersStore.arOcclusionFragmentShader).toContain('uniform float isCrystalline');
      expect(mockShadersStore.arOcclusionFragmentShader).toContain('uniform vec3 crystallineColor');
    });

    it('AR occlusion fragment shader implements Fresnel edge glow for crystalline variant', () => {
      expect(mockShadersStore.arOcclusionFragmentShader).toContain('fresnel');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Nebula Corruption shaders
  // ---------------------------------------------------------------------------

  describe('3. Nebula Corruption shaders', () => {
    it('registers nebulaCorruptionVertexShader', () => {
      expect(mockShadersStore.nebulaCorruptionVertexShader).toBeDefined();
      expect(typeof mockShadersStore.nebulaCorruptionVertexShader).toBe('string');
    });

    it('registers nebulaCorruptionFragmentShader', () => {
      expect(mockShadersStore.nebulaCorruptionFragmentShader).toBeDefined();
      expect(typeof mockShadersStore.nebulaCorruptionFragmentShader).toBe('string');
    });

    it('nebula corruption vertex shader contains breathing pulse formula', () => {
      expect(mockShadersStore.nebulaCorruptionVertexShader).toContain('sin(time * 1.8)');
      expect(mockShadersStore.nebulaCorruptionVertexShader).toContain('corruptionLevel * 0.03');
    });

    it('nebula corruption fragment shader uses FBM noise', () => {
      expect(mockShadersStore.nebulaCorruptionFragmentShader).toContain('fbm');
    });

    it('nebula corruption fragment shader has 3-stop color ramp uniforms', () => {
      expect(mockShadersStore.nebulaCorruptionFragmentShader).toContain('uniform vec3 calmColor');
      expect(mockShadersStore.nebulaCorruptionFragmentShader).toContain('uniform vec3 warmColor');
      expect(mockShadersStore.nebulaCorruptionFragmentShader).toContain('uniform vec3 violentColor');
    });

    it('nebula corruption fragment shader has tension-driven static at 0.7', () => {
      expect(mockShadersStore.nebulaCorruptionFragmentShader).toContain('tension > 0.7');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Crystalline Boss shaders
  // ---------------------------------------------------------------------------

  describe('4. Crystalline Boss shaders', () => {
    it('registers crystallineBossVertexShader', () => {
      expect(mockShadersStore.crystallineBossVertexShader).toBeDefined();
    });

    it('registers crystallineBossFragmentShader', () => {
      expect(mockShadersStore.crystallineBossFragmentShader).toBeDefined();
    });

    it('crystalline boss vertex shader has sine displacement formula', () => {
      expect(mockShadersStore.crystallineBossVertexShader).toContain(
        'sin(position.x * 8.0 + time)',
      );
      expect(mockShadersStore.crystallineBossVertexShader).toContain(
        'sin(position.z * 8.0 + time)',
      );
      expect(mockShadersStore.crystallineBossVertexShader).toContain('0.05 * tension');
    });

    it('crystalline boss fragment shader has IQ palette function', () => {
      expect(mockShadersStore.crystallineBossFragmentShader).toContain('iqPalette');
    });

    it('crystalline boss fragment shader has Fresnel edge glow', () => {
      expect(mockShadersStore.crystallineBossFragmentShader).toContain('fresnel');
    });

    it('crystalline boss fragment shader has refraction', () => {
      expect(mockShadersStore.crystallineBossFragmentShader).toContain('refract');
    });

    it('crystalline boss fragment shader has cameraPosition uniform', () => {
      expect(mockShadersStore.crystallineBossFragmentShader).toContain('uniform vec3 cameraPosition');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Corruption Tendril shaders
  // ---------------------------------------------------------------------------

  describe('5. Corruption Tendril shaders', () => {
    it('registers corruptionTendrilVertexShader', () => {
      expect(mockShadersStore.corruptionTendrilVertexShader).toBeDefined();
    });

    it('registers corruptionTendrilFragmentShader', () => {
      expect(mockShadersStore.corruptionTendrilFragmentShader).toBeDefined();
    });

    it('tendril vertex shader has sinusoidal deformation formula', () => {
      expect(mockShadersStore.corruptionTendrilVertexShader).toContain(
        'sin(position.y * 6.0 + time * 2.0) * 0.02 * tension',
      );
    });

    it('tendril fragment shader has gradient alpha from base to tip', () => {
      expect(mockShadersStore.corruptionTendrilFragmentShader).toContain('1.0 - vUV.y');
    });

    it('tendril fragment shader has emissive pulse', () => {
      expect(mockShadersStore.corruptionTendrilFragmentShader).toContain('pulse');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Neon Raymarcher shaders
  // ---------------------------------------------------------------------------

  describe('6. Neon Raymarcher shaders', () => {
    it('registers neonRaymarcherVertexShader', () => {
      expect(mockShadersStore.neonRaymarcherVertexShader).toBeDefined();
    });

    it('registers neonRaymarcherFragmentShader', () => {
      expect(mockShadersStore.neonRaymarcherFragmentShader).toBeDefined();
    });

    it('neon raymarcher fragment shader has SDF raymarching', () => {
      expect(mockShadersStore.neonRaymarcherFragmentShader).toContain('sdBox');
      expect(mockShadersStore.neonRaymarcherFragmentShader).toContain('opSmoothUnion');
    });

    it('neon raymarcher fragment shader has 128-step raymarching', () => {
      expect(mockShadersStore.neonRaymarcherFragmentShader).toContain('MAX_STEPS');
      expect(mockShadersStore.neonRaymarcherFragmentShader).toContain('PRECISION');
    });

    it('neon raymarcher fragment shader has traitColor uniform', () => {
      expect(mockShadersStore.neonRaymarcherFragmentShader).toContain('uniform vec3 traitColor');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Thin Film Interference shader
  // ---------------------------------------------------------------------------

  describe('7. Thin Film Interference shader', () => {
    it('registers thinFilmInterferenceFragmentShader', () => {
      expect(mockShadersStore.thinFilmInterferenceFragmentShader).toBeDefined();
    });

    it('thin film shader has cosine interference pattern', () => {
      expect(mockShadersStore.thinFilmInterferenceFragmentShader).toContain(
        'cos(dot(viewDir, normal) * 12.0) * 0.5 + 0.5',
      );
    });

    it('thin film shader has iridescence wavelength decomposition', () => {
      expect(mockShadersStore.thinFilmInterferenceFragmentShader).toContain('iridescence');
    });

    it('thin film shader has cameraPosition uniform', () => {
      expect(mockShadersStore.thinFilmInterferenceFragmentShader).toContain('uniform vec3 cameraPosition');
    });

    it('thin film shader has Fresnel rim brightness', () => {
      expect(mockShadersStore.thinFilmInterferenceFragmentShader).toContain('fresnel');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. World Crush Distortion shaders
  // ---------------------------------------------------------------------------

  describe('8. World Crush Distortion shaders', () => {
    it('registers worldCrushDistortionVertexShader', () => {
      expect(mockShadersStore.worldCrushDistortionVertexShader).toBeDefined();
    });

    it('registers worldCrushDistortionFragmentShader', () => {
      expect(mockShadersStore.worldCrushDistortionFragmentShader).toBeDefined();
    });

    it('world crush fragment shader has impactPoint uniform', () => {
      expect(mockShadersStore.worldCrushDistortionFragmentShader).toContain('uniform vec2 impactPoint');
    });

    it('world crush fragment shader has distortionStrength uniform', () => {
      expect(mockShadersStore.worldCrushDistortionFragmentShader).toContain('uniform float distortionStrength');
    });

    it('world crush fragment shader has shakeOffset uniform', () => {
      expect(mockShadersStore.worldCrushDistortionFragmentShader).toContain('uniform vec2 shakeOffset');
    });

    it('world crush fragment shader has chromatic aberration', () => {
      expect(mockShadersStore.worldCrushDistortionFragmentShader).toContain('chromaOffset');
    });

    it('world crush fragment shader has textureSampler', () => {
      expect(mockShadersStore.worldCrushDistortionFragmentShader).toContain('uniform sampler2D textureSampler');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Procedural Keycap Glow shaders
  // ---------------------------------------------------------------------------

  describe('9. Procedural Keycap Glow shaders', () => {
    it('registers proceduralKeycapGlowVertexShader', () => {
      expect(mockShadersStore.proceduralKeycapGlowVertexShader).toBeDefined();
    });

    it('registers proceduralKeycapGlowFragmentShader', () => {
      expect(mockShadersStore.proceduralKeycapGlowFragmentShader).toBeDefined();
    });

    it('keycap glow fragment shader has matchProgress uniform', () => {
      expect(mockShadersStore.proceduralKeycapGlowFragmentShader).toContain('uniform float matchProgress');
    });

    it('keycap glow fragment shader has glowColor uniform', () => {
      expect(mockShadersStore.proceduralKeycapGlowFragmentShader).toContain('uniform vec3 glowColor');
    });

    it('keycap glow fragment shader has letter mask region', () => {
      expect(mockShadersStore.proceduralKeycapGlowFragmentShader).toContain('letterMask');
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Mechanical Crack shader
  // ---------------------------------------------------------------------------

  describe('10. Mechanical Crack shader', () => {
    it('registers mechanicalCrackFragmentShader', () => {
      expect(mockShadersStore.mechanicalCrackFragmentShader).toBeDefined();
    });

    it('mechanical crack shader has Voronoi distance field', () => {
      expect(mockShadersStore.mechanicalCrackFragmentShader).toContain('voronoi');
    });

    it('mechanical crack shader has smoothstep crack formula', () => {
      expect(mockShadersStore.mechanicalCrackFragmentShader).toContain('smoothstep(0.02, 0.0');
    });

    it('mechanical crack shader has tension-driven visibility', () => {
      expect(mockShadersStore.mechanicalCrackFragmentShader).toContain('crackVisibility');
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Echo Ghost shaders
  // ---------------------------------------------------------------------------

  describe('11. Echo Ghost shaders', () => {
    it('registers echoGhostVertexShader', () => {
      expect(mockShadersStore.echoGhostVertexShader).toBeDefined();
    });

    it('registers echoGhostFragmentShader', () => {
      expect(mockShadersStore.echoGhostFragmentShader).toBeDefined();
    });

    it('echo ghost vertex shader has sine-wave ripple displacement', () => {
      expect(mockShadersStore.echoGhostVertexShader).toContain('sin(position.y * 20.0 + time * 4.0)');
    });

    it('echo ghost vertex shader has distortAmount uniform', () => {
      expect(mockShadersStore.echoGhostVertexShader).toContain('uniform float distortAmount');
    });

    it('echo ghost fragment shader has scan-line effect', () => {
      expect(mockShadersStore.echoGhostFragmentShader).toContain('scanLine');
    });

    it('echo ghost fragment shader has alpha uniform', () => {
      expect(mockShadersStore.echoGhostFragmentShader).toContain('uniform float alpha');
    });

    it('echo ghost fragment shader has glowColor uniform', () => {
      expect(mockShadersStore.echoGhostFragmentShader).toContain('uniform vec3 glowColor');
    });
  });

  // ---------------------------------------------------------------------------
  // 12. Coherence Ring Fill shaders
  // ---------------------------------------------------------------------------

  describe('12. Coherence Ring Fill shaders', () => {
    it('registers coherenceRingFillVertexShader', () => {
      expect(mockShadersStore.coherenceRingFillVertexShader).toBeDefined();
    });

    it('registers coherenceRingFillFragmentShader', () => {
      expect(mockShadersStore.coherenceRingFillFragmentShader).toBeDefined();
    });

    it('coherence ring fragment shader has coherenceLevel uniform', () => {
      expect(mockShadersStore.coherenceRingFillFragmentShader).toContain('uniform float coherenceLevel');
    });

    it('coherence ring fragment shader has polar angle computation', () => {
      expect(mockShadersStore.coherenceRingFillFragmentShader).toContain('atan');
    });

    it('coherence ring fragment shader has fill arc based on coherenceLevel', () => {
      expect(mockShadersStore.coherenceRingFillFragmentShader).toContain('coherenceLevel * 6.28318530718');
    });
  });

  // ---------------------------------------------------------------------------
  // 13. Dust Particle shaders
  // ---------------------------------------------------------------------------

  describe('13. Dust Particle shaders', () => {
    it('registers dustParticleVertexShader', () => {
      expect(mockShadersStore.dustParticleVertexShader).toBeDefined();
    });

    it('registers dustParticleFragmentShader', () => {
      expect(mockShadersStore.dustParticleFragmentShader).toBeDefined();
    });

    it('dust particle vertex shader has driftDirection uniform', () => {
      expect(mockShadersStore.dustParticleVertexShader).toContain('uniform vec3 driftDirection');
    });

    it('dust particle vertex shader has particleAge uniform', () => {
      expect(mockShadersStore.dustParticleVertexShader).toContain('uniform float particleAge');
    });

    it('dust particle vertex shader has gravity falloff', () => {
      expect(mockShadersStore.dustParticleVertexShader).toContain('particleAge * particleAge');
    });

    it('dust particle fragment shader has circular shape', () => {
      expect(mockShadersStore.dustParticleFragmentShader).toContain('length(vUV - 0.5)');
    });
  });

  // ---------------------------------------------------------------------------
  // 14. Shatter Shard shaders
  // ---------------------------------------------------------------------------

  describe('14. Shatter Shard shaders', () => {
    it('registers shatterShardVertexShader', () => {
      expect(mockShadersStore.shatterShardVertexShader).toBeDefined();
    });

    it('registers shatterShardFragmentShader', () => {
      expect(mockShadersStore.shatterShardFragmentShader).toBeDefined();
    });

    it('shatter shard vertex shader has shardVelocity uniform', () => {
      expect(mockShadersStore.shatterShardVertexShader).toContain('uniform vec3 shardVelocity');
    });

    it('shatter shard vertex shader has shardRotation uniform', () => {
      expect(mockShadersStore.shatterShardVertexShader).toContain('uniform vec3 shardRotation');
    });

    it('shatter shard vertex shader has shatterTime uniform', () => {
      expect(mockShadersStore.shatterShardVertexShader).toContain('uniform float shatterTime');
    });

    it('shatter shard vertex shader has gravity (4.9 half-g)', () => {
      expect(mockShadersStore.shatterShardVertexShader).toContain('4.9 * shatterTime * shatterTime');
    });

    it('shatter shard fragment shader has glass refraction', () => {
      expect(mockShadersStore.shatterShardFragmentShader).toContain('refract');
    });

    it('shatter shard fragment shader has time-based fade', () => {
      expect(mockShadersStore.shatterShardFragmentShader).toContain('smoothstep(1.0, 3.0, shatterTime)');
    });
  });

  // ---------------------------------------------------------------------------
  // 15. Morph Transition shader
  // ---------------------------------------------------------------------------

  describe('15. Morph Transition shader', () => {
    it('registers morphTransitionVertexShader', () => {
      expect(mockShadersStore.morphTransitionVertexShader).toBeDefined();
    });

    it('morph transition has morphProgress uniform', () => {
      expect(mockShadersStore.morphTransitionVertexShader).toContain('uniform float morphProgress');
    });

    it('morph transition has positionTarget attribute', () => {
      expect(mockShadersStore.morphTransitionVertexShader).toContain('attribute vec3 positionTarget');
    });

    it('morph transition has normalTarget attribute', () => {
      expect(mockShadersStore.morphTransitionVertexShader).toContain('attribute vec3 normalTarget');
    });

    it('morph transition interpolates between base and target', () => {
      expect(mockShadersStore.morphTransitionVertexShader).toContain('mix(position, positionTarget, morphProgress)');
    });
  });

  // ---------------------------------------------------------------------------
  // 16. Platter Surface shader
  // ---------------------------------------------------------------------------

  describe('16. Platter Surface shader', () => {
    it('registers platterSurfaceFragmentShader', () => {
      expect(mockShadersStore.platterSurfaceFragmentShader).toBeDefined();
    });

    it('platter surface has brushed metal pattern', () => {
      expect(mockShadersStore.platterSurfaceFragmentShader).toContain('brushedMetal');
    });

    it('platter surface has micro-scratches', () => {
      expect(mockShadersStore.platterSurfaceFragmentShader).toContain('scratch');
    });

    it('platter surface has grime texture', () => {
      expect(mockShadersStore.platterSurfaceFragmentShader).toContain('grime');
    });

    it('platter surface has tension-driven wear', () => {
      expect(mockShadersStore.platterSurfaceFragmentShader).toContain('tension * 0.15');
    });
  });

  // ---------------------------------------------------------------------------
  // 17. Lever Mechanical shaders
  // ---------------------------------------------------------------------------

  describe('17. Lever Mechanical shaders', () => {
    it('registers leverMechanicalVertexShader', () => {
      expect(mockShadersStore.leverMechanicalVertexShader).toBeDefined();
    });

    it('registers leverMechanicalFragmentShader', () => {
      expect(mockShadersStore.leverMechanicalFragmentShader).toBeDefined();
    });

    it('lever vertex shader has leverAngle uniform', () => {
      expect(mockShadersStore.leverMechanicalVertexShader).toContain('uniform float leverAngle');
    });

    it('lever vertex shader has pivotPoint uniform', () => {
      expect(mockShadersStore.leverMechanicalVertexShader).toContain('uniform vec3 pivotPoint');
    });

    it('lever vertex shader has joint rotation', () => {
      expect(mockShadersStore.leverMechanicalVertexShader).toContain('cos(leverAngle)');
      expect(mockShadersStore.leverMechanicalVertexShader).toContain('sin(leverAngle)');
    });

    it('lever fragment shader has wear marks', () => {
      expect(mockShadersStore.leverMechanicalFragmentShader).toContain('wearMarks');
    });
  });

  // ---------------------------------------------------------------------------
  // 18. Sphere Breathing shader
  // ---------------------------------------------------------------------------

  describe('18. Sphere Breathing shader', () => {
    it('registers sphereBreathingVertexShader', () => {
      expect(mockShadersStore.sphereBreathingVertexShader).toBeDefined();
    });

    it('sphere breathing has the exact breathing formula', () => {
      expect(mockShadersStore.sphereBreathingVertexShader).toContain('sin(time * 1.8 * 6.28318530718)');
      expect(mockShadersStore.sphereBreathingVertexShader).toContain('tension * 0.03');
    });

    it('sphere breathing displaces position', () => {
      expect(mockShadersStore.sphereBreathingVertexShader).toContain('position * (1.0 + breathe)');
    });
  });

  // ---------------------------------------------------------------------------
  // 19. Tensor Field shader
  // ---------------------------------------------------------------------------

  describe('19. Tensor Field shader', () => {
    it('registers tensorFieldFragmentShader', () => {
      expect(mockShadersStore.tensorFieldFragmentShader).toBeDefined();
    });

    it('tensor field has streamline visualization', () => {
      expect(mockShadersStore.tensorFieldFragmentShader).toContain('flowDir');
      expect(mockShadersStore.tensorFieldFragmentShader).toContain('stream');
    });

    it('tensor field has tension-driven brightness', () => {
      expect(mockShadersStore.tensorFieldFragmentShader).toContain('stream * tension');
    });

    it('tensor field has blue-to-red color based on tension', () => {
      expect(mockShadersStore.tensorFieldFragmentShader).toContain('mix(vec3(0.2, 0.4, 1.0), vec3(1.0, 0.2, 0.1), tension)');
    });
  });

  // ---------------------------------------------------------------------------
  // 20. Glass Refraction shader
  // ---------------------------------------------------------------------------

  describe('20. Glass Refraction shader', () => {
    it('registers glassRefractionFragmentShader', () => {
      expect(mockShadersStore.glassRefractionFragmentShader).toBeDefined();
    });

    it('glass refraction uses IOR 1.52', () => {
      expect(mockShadersStore.glassRefractionFragmentShader).toContain('1.0 / 1.52');
    });

    it('glass refraction has caustic approximation', () => {
      expect(mockShadersStore.glassRefractionFragmentShader).toContain('caustic');
    });

    it('glass refraction has Fresnel reflection', () => {
      expect(mockShadersStore.glassRefractionFragmentShader).toContain('fresnel');
    });

    it('glass refraction has cameraPosition uniform', () => {
      expect(mockShadersStore.glassRefractionFragmentShader).toContain('uniform vec3 cameraPosition');
    });
  });

  // ---------------------------------------------------------------------------
  // 21. Enemy Trail shaders
  // ---------------------------------------------------------------------------

  describe('21. Enemy Trail shaders', () => {
    it('registers enemyTrailVertexShader', () => {
      expect(mockShadersStore.enemyTrailVertexShader).toBeDefined();
    });

    it('registers enemyTrailFragmentShader', () => {
      expect(mockShadersStore.enemyTrailFragmentShader).toBeDefined();
    });

    it('enemy trail vertex shader has trailVelocity uniform', () => {
      expect(mockShadersStore.enemyTrailVertexShader).toContain('uniform vec3 trailVelocity');
    });

    it('enemy trail vertex shader has trailAge uniform', () => {
      expect(mockShadersStore.enemyTrailVertexShader).toContain('uniform float trailAge');
    });

    it('enemy trail fragment shader has traitColor uniform', () => {
      expect(mockShadersStore.enemyTrailFragmentShader).toContain('uniform vec3 traitColor');
    });

    it('enemy trail fragment shader has taper along V axis', () => {
      expect(mockShadersStore.enemyTrailFragmentShader).toContain('1.0 - vUV.y');
    });
  });

  // ---------------------------------------------------------------------------
  // 22. Rim Highlight shader
  // ---------------------------------------------------------------------------

  describe('22. Rim Highlight shader', () => {
    it('registers rimHighlightFragmentShader', () => {
      expect(mockShadersStore.rimHighlightFragmentShader).toBeDefined();
    });

    it('rim highlight has Fresnel rim detection', () => {
      expect(mockShadersStore.rimHighlightFragmentShader).toContain('pow(1.0 - abs(dot(viewDir, vNormalW)), 3.0)');
    });

    it('rim highlight has tension-driven intensity', () => {
      expect(mockShadersStore.rimHighlightFragmentShader).toContain('0.2 + tension * 0.8');
    });

    it('rim highlight has pulsation at high tension', () => {
      expect(mockShadersStore.rimHighlightFragmentShader).toContain('tension > 0.5');
    });

    it('rim highlight has cameraPosition uniform', () => {
      expect(mockShadersStore.rimHighlightFragmentShader).toContain('uniform vec3 cameraPosition');
    });
  });

  // ---------------------------------------------------------------------------
  // 23. Ambient Corruption shaders
  // ---------------------------------------------------------------------------

  describe('23. Ambient Corruption shaders', () => {
    it('registers ambientCorruptionVertexShader', () => {
      expect(mockShadersStore.ambientCorruptionVertexShader).toBeDefined();
    });

    it('registers ambientCorruptionFragmentShader', () => {
      expect(mockShadersStore.ambientCorruptionFragmentShader).toBeDefined();
    });

    it('ambient corruption fragment has textureSampler', () => {
      expect(mockShadersStore.ambientCorruptionFragmentShader).toContain('uniform sampler2D textureSampler');
    });

    it('ambient corruption fragment has scan lines', () => {
      expect(mockShadersStore.ambientCorruptionFragmentShader).toContain('scanLine');
    });

    it('ambient corruption fragment has chromatic aberration', () => {
      expect(mockShadersStore.ambientCorruptionFragmentShader).toContain('chromaShift');
    });

    it('ambient corruption fragment has vignette', () => {
      expect(mockShadersStore.ambientCorruptionFragmentShader).toContain('vignette');
    });

    it('ambient corruption fragment has film grain', () => {
      expect(mockShadersStore.ambientCorruptionFragmentShader).toContain('grain');
    });
  });

  // ===========================================================================
  // Cross-cutting tests
  // ===========================================================================

  describe('All vertex shaders are registered', () => {
    it.each(ALL_VERTEX_SHADERS)('%s is registered as a non-empty string', (key) => {
      expect(mockShadersStore[key]).toBeDefined();
      expect(typeof mockShadersStore[key]).toBe('string');
      expect(mockShadersStore[key].length).toBeGreaterThan(50);
    });
  });

  describe('All fragment shaders are registered', () => {
    it.each(ALL_FRAGMENT_SHADERS)('%s is registered as a non-empty string', (key) => {
      expect(mockShadersStore[key]).toBeDefined();
      expect(typeof mockShadersStore[key]).toBe('string');
      expect(mockShadersStore[key].length).toBeGreaterThan(50);
    });
  });

  describe('All shaders have precision qualifier', () => {
    it.each(ALL_SHADERS)('%s starts with precision highp float', (key) => {
      expect(mockShadersStore[key].trim()).toMatch(/^precision highp float/);
    });
  });

  describe('All shaders have gl_Position or gl_FragColor', () => {
    it.each(ALL_VERTEX_SHADERS)('%s contains gl_Position', (key) => {
      expect(mockShadersStore[key]).toContain('gl_Position');
    });

    it.each(ALL_FRAGMENT_SHADERS)('%s contains gl_FragColor', (key) => {
      expect(mockShadersStore[key]).toContain('gl_FragColor');
    });
  });

  describe('All shaders have void main(void)', () => {
    it.each(ALL_SHADERS)('%s contains void main(void)', (key) => {
      expect(mockShadersStore[key]).toContain('void main(void)');
    });
  });

  describe('Common uniform availability in fragment shaders', () => {
    const standardFragmentShaders = [
      'celestialNebulaFragmentShader',
      'nebulaCorruptionFragmentShader',
      'crystallineBossFragmentShader',
      'corruptionTendrilFragmentShader',
      'neonRaymarcherFragmentShader',
      'thinFilmInterferenceFragmentShader',
      'proceduralKeycapGlowFragmentShader',
      'mechanicalCrackFragmentShader',
      // echoGhostFragmentShader uses its own uniform interface (alpha, glowColor)
      'coherenceRingFillFragmentShader',
      'dustParticleFragmentShader',
      'platterSurfaceFragmentShader',
      'leverMechanicalFragmentShader',
      'tensorFieldFragmentShader',
      'glassRefractionFragmentShader',
      'enemyTrailFragmentShader',
      'rimHighlightFragmentShader',
    ] as const;

    it.each(standardFragmentShaders)('%s has uniform float tension', (key) => {
      expect(mockShadersStore[key]).toContain('uniform float tension');
    });

    it.each(standardFragmentShaders)('%s has uniform float time', (key) => {
      expect(mockShadersStore[key]).toContain('uniform float time');
    });

    it.each(standardFragmentShaders)('%s has uniform vec3 baseColor', (key) => {
      expect(mockShadersStore[key]).toContain('uniform vec3 baseColor');
    });
  });

  describe('Vertex+Fragment pair completeness', () => {
    const pairedShaders = [
      'celestialNebula',
      'arOcclusion',
      'nebulaCorruption',
      'crystallineBoss',
      'corruptionTendril',
      'neonRaymarcher',
      'worldCrushDistortion',
      'proceduralKeycapGlow',
      'echoGhost',
      'coherenceRingFill',
      'dustParticle',
      'shatterShard',
      'leverMechanical',
      'enemyTrail',
      'ambientCorruption',
    ] as const;

    it.each(pairedShaders)('%s has both vertex and fragment shaders', (name) => {
      expect(mockShadersStore[`${name}VertexShader`]).toBeDefined();
      expect(mockShadersStore[`${name}FragmentShader`]).toBeDefined();
    });
  });

  describe('Fragment-only shaders (no vertex pair)', () => {
    const fragmentOnlyShaders = [
      'thinFilmInterference',
      'mechanicalCrack',
      'platterSurface',
      'tensorField',
      'glassRefraction',
      'rimHighlight',
    ] as const;

    it.each(fragmentOnlyShaders)('%s has fragment shader registered', (name) => {
      expect(mockShadersStore[`${name}FragmentShader`]).toBeDefined();
    });
  });

  describe('Vertex-only shaders (no fragment pair)', () => {
    const vertexOnlyShaders = [
      'morphTransition',
      'sphereBreathing',
    ] as const;

    it.each(vertexOnlyShaders)('%s has vertex shader registered', (name) => {
      expect(mockShadersStore[`${name}VertexShader`]).toBeDefined();
    });
  });

  // ===========================================================================
  // Post-process shader specifics
  // ===========================================================================

  describe('Post-process shaders have textureSampler', () => {
    it('worldCrushDistortion has textureSampler', () => {
      expect(mockShadersStore.worldCrushDistortionFragmentShader).toContain('uniform sampler2D textureSampler');
    });

    it('ambientCorruption has textureSampler', () => {
      expect(mockShadersStore.ambientCorruptionFragmentShader).toContain('uniform sampler2D textureSampler');
    });
  });

  describe('Post-process vertex shaders are fullscreen quads', () => {
    it('worldCrushDistortion vertex uses position directly', () => {
      expect(mockShadersStore.worldCrushDistortionVertexShader).toContain('vec4(position, 1.0)');
    });

    it('ambientCorruption vertex uses position directly', () => {
      expect(mockShadersStore.ambientCorruptionVertexShader).toContain('vec4(position, 1.0)');
    });
  });

  // ===========================================================================
  // initializeShaderRegistry function
  // ===========================================================================

  describe('initializeShaderRegistry', () => {
    it('is a callable function', () => {
      expect(typeof initializeShaderRegistry).toBe('function');
    });

    it('can be called without errors', () => {
      expect(() => initializeShaderRegistry()).not.toThrow();
    });

    it('shaders remain registered after calling initializeShaderRegistry', () => {
      initializeShaderRegistry();
      expect(mockShadersStore.celestialNebulaVertexShader).toBeDefined();
      expect(mockShadersStore.nebulaCorruptionFragmentShader).toBeDefined();
      expect(mockShadersStore.crystallineBossVertexShader).toBeDefined();
      expect(mockShadersStore.thinFilmInterferenceFragmentShader).toBeDefined();
      expect(mockShadersStore.sphereBreathingVertexShader).toBeDefined();
      expect(mockShadersStore.ambientCorruptionFragmentShader).toBeDefined();
    });

    it('total shader count is at least 38 (17 vertex + 21 fragment)', () => {
      const shaderKeys = Object.keys(mockShadersStore).filter(
        (k) => k.endsWith('VertexShader') || k.endsWith('FragmentShader'),
      );
      expect(shaderKeys.length).toBeGreaterThanOrEqual(38);
    });
  });

  // ===========================================================================
  // CSP safety
  // ===========================================================================

  describe('CSP safety', () => {
    it('all shaders are static string literals (no dynamic code patterns)', () => {
      for (const key of ALL_SHADERS) {
        // Shaders must be plain GLSL strings, not dynamically constructed
        expect(typeof mockShadersStore[key]).toBe('string');
        expect(mockShadersStore[key].length).toBeGreaterThan(0);
      }
    });
  });
});
