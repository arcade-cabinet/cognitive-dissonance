import * as fc from 'fast-check';
import type { TensionCurveConfig } from '../../types';
import { EchoSystem } from '../EchoSystem';
import { TensionSystem } from '../TensionSystem';

// Provide window.setTimeout and window.clearTimeout in Node.js environment
if (typeof window === 'undefined') {
  (global as any).window = {
    setTimeout: global.setTimeout.bind(global),
    clearTimeout: global.clearTimeout.bind(global),
  };
}

// Mock performance.now for shader time updates
if (typeof performance === 'undefined') {
  (global as any).performance = { now: () => Date.now() };
}

// ── Mock @babylonjs/core modules ──

jest.mock('@babylonjs/core/Materials/effect', () => ({
  Effect: {
    ShadersStore: {},
  },
}));

const mockSetFloat = jest.fn();
const mockSetColor3 = jest.fn();

jest.mock('@babylonjs/core/Materials/shaderMaterial', () => ({
  ShaderMaterial: jest.fn().mockImplementation(() => ({
    setFloat: mockSetFloat,
    setColor3: mockSetColor3,
    dispose: jest.fn(),
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn((_r: number, _g: number, _b: number) => ({ r: _r, g: _g, b: _b })),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => ({
  Vector3: jest.fn((x: number, y: number, z: number) => ({ x, y, z, set: jest.fn() })),
}));

jest.mock('@babylonjs/core/Buffers/buffer', () => ({
  VertexBuffer: {
    PositionKind: 'position',
  },
}));

jest.mock('@babylonjs/core/Meshes/mesh', () => ({}));

const mockGetVerticesData = jest.fn((kind: string) => {
  if (kind === 'position') {
    // 12 vertices for an icosphere (subdivisions=1) with deterministic values
    const positions = [];
    for (let i = 0; i < 36; i++) {
      // Use deterministic pseudo-random (sin-based) so tests are reproducible
      positions.push(Math.sin(i * 1.37) * 0.04);
    }
    return positions;
  }
  return null;
});

const mockUpdateVerticesData = jest.fn();
const mockMeshDispose = jest.fn();

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateIcoSphere: jest.fn((_name: string, _opts: any, _scene: any) => ({
      name: _name,
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      scaling: { x: 1, y: 1, z: 1, set: jest.fn() },
      material: null,
      hasVertexAlpha: false,
      getVerticesData: mockGetVerticesData,
      updateVerticesData: mockUpdateVerticesData,
      dispose: mockMeshDispose,
    })),
  },
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    fromTo: jest.fn(),
    to: jest.fn(),
  },
}));

// Helper to create fresh singleton instances bypassing private constructors
function createTensionSystem(): TensionSystem {
  (TensionSystem as any).instance = null;
  return TensionSystem.getInstance();
}

function createEchoSystem(): EchoSystem {
  (EchoSystem as any).instance = null;
  return EchoSystem.getInstance();
}

describe('EchoSystem', () => {
  let system: EchoSystem;
  let tensionSystem: TensionSystem;
  const mockScene = {
    registerBeforeRender: jest.fn(),
    unregisterBeforeRender: jest.fn(),
  } as any;
  const mockTensionCurve: TensionCurveConfig = {
    increaseRate: 1.0,
    decreaseRate: 1.0,
    overStabilizationThreshold: 0.05,
    reboundProbability: 0.02,
    reboundAmount: 0.12,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tensionSystem = createTensionSystem();
    tensionSystem.init(mockTensionCurve);
    system = createEchoSystem();
    system.initialize(mockScene, tensionSystem);
  });

  afterEach(() => {
    system.dispose();
    tensionSystem.dispose();
  });

  describe('Unit Tests', () => {
    it('spawns echo and increases tension', () => {
      const initialTension = tensionSystem.currentTension;
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });

      // Tension should increase by 0.012 (missed pattern penalty)
      expect(tensionSystem.currentTension).toBeGreaterThan(initialTension);
      expect(tensionSystem.currentTension).toBeCloseTo(initialTension + 0.012, 5);
    });

    it('prevents duplicate echoes for the same key', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      const tensionAfterFirst = tensionSystem.currentTension;

      // Try to spawn another echo for the same key
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });

      // Tension should not increase again
      expect(tensionSystem.currentTension).toBe(tensionAfterFirst);
    });

    it('allows echoes for different keys', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      const tensionAfterFirst = tensionSystem.currentTension;

      system.spawnEcho('W', { x: 0, y: 0, z: 0 });

      // Tension should increase again
      expect(tensionSystem.currentTension).toBeGreaterThan(tensionAfterFirst);
    });

    it('hasActiveEcho returns true for spawned echo', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });

      // Echo should exist immediately
      expect(system.hasActiveEcho('Q')).toBe(true);
    });

    it('disposeEcho removes the echo', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      expect(system.hasActiveEcho('Q')).toBe(true);

      system.disposeEcho('Q');
      expect(system.hasActiveEcho('Q')).toBe(false);
    });

    // ── IcoSphere mesh creation tests ──

    it('uses CreateIcoSphere instead of CreateBox for echo meshes', () => {
      const { MeshBuilder } = require('@babylonjs/core/Meshes/meshBuilder');
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });

      expect(MeshBuilder.CreateIcoSphere).toHaveBeenCalledWith(
        'echo_Q',
        expect.objectContaining({
          radius: 0.04,
          subdivisions: 1,
          updatable: true,
        }),
        mockScene,
      );
    });

    it('creates IcoSphere with low-poly subdivision=1', () => {
      const { MeshBuilder } = require('@babylonjs/core/Meshes/meshBuilder');
      system.spawnEcho('A', { x: 1, y: 2, z: 3 });

      const createCall = MeshBuilder.CreateIcoSphere.mock.calls[0];
      expect(createCall[1].subdivisions).toBe(1);
    });

    // ── Vertex displacement tests ──

    it('retrieves vertex positions for displacement', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      expect(mockGetVerticesData).toHaveBeenCalledWith('position');
    });

    it('updates vertex data after displacement', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      expect(mockUpdateVerticesData).toHaveBeenCalledWith(
        'position',
        expect.any(Array),
      );
    });

    it('flattens Y axis of displaced vertices for keycap-like proportions', () => {
      // Verify that updateVerticesData is called with positions where Y is compressed
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      if (mockUpdateVerticesData.mock.calls.length > 0) {
        const updatedPositions = mockUpdateVerticesData.mock.calls[0][1];
        const origPositions = mockGetVerticesData('position');
        if (origPositions) {
          // On average, Y components should be compressed compared to X/Z
          let totalYRatio = 0;
          let count = 0;
          for (let i = 0; i < updatedPositions.length; i += 3) {
            const origY = Math.abs(origPositions[i + 1]);
            const newY = Math.abs(updatedPositions[i + 1]);
            if (origY > 0.001) {
              totalYRatio += newY / origY;
              count++;
            }
          }
          // Average Y compression should be around 0.5 (the flatten factor)
          if (count > 0) {
            expect(totalYRatio / count).toBeLessThan(0.75);
          }
        }
      }
    });

    // ── ShaderMaterial tests ──

    it('creates a ShaderMaterial with echoGhost shaders', () => {
      const { ShaderMaterial } = require('@babylonjs/core/Materials/shaderMaterial');
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });

      expect(ShaderMaterial).toHaveBeenCalledWith(
        'echoShader_Q',
        mockScene,
        expect.objectContaining({
          vertex: 'echoGhost',
          fragment: 'echoGhost',
        }),
        expect.objectContaining({
          attributes: expect.arrayContaining(['position', 'normal']),
          uniforms: expect.arrayContaining(['worldViewProjection', 'time', 'alpha', 'glowColor']),
          needAlphaBlending: true,
        }),
      );
    });

    it('sets initial shader uniforms (time, distortAmount, alpha, glowColor)', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });

      expect(mockSetFloat).toHaveBeenCalledWith('time', 0);
      expect(mockSetFloat).toHaveBeenCalledWith('distortAmount', 0.003);
      expect(mockSetFloat).toHaveBeenCalledWith('alpha', 0);
      expect(mockSetColor3).toHaveBeenCalledWith(
        'glowColor',
        expect.objectContaining({ r: 1.0, g: 0.3, b: 0.3 }),
      );
    });

    it('registers a per-frame update for shader time uniform', () => {
      system.spawnEcho('Q', { x: 0, y: 0, z: 0 });
      expect(mockScene.registerBeforeRender).toHaveBeenCalled();
    });
  });

  describe('Property-Based Tests', () => {
    // P6: Echo Uniqueness
    it('at most one active echo per key at any time', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D'), { minLength: 1, maxLength: 10 }),
          (keys) => {
            const testSystem = createEchoSystem();
            testSystem.initialize(mockScene, tensionSystem);

            // Spawn echoes for all keys (including duplicates)
            for (const key of keys) {
              testSystem.spawnEcho(key, { x: 0, y: 0, z: 0 });
            }

            // Count unique keys
            const uniqueKeys = new Set(keys);

            // Active echo count should equal unique key count
            let activeCount = 0;
            for (const key of uniqueKeys) {
              if (testSystem.hasActiveEcho(key)) {
                activeCount++;
              }
            }

            expect(activeCount).toBe(uniqueKeys.size);

            testSystem.dispose();
          },
        ),
      );
    });

    it('spawning echo for same key multiple times is a no-op', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D'),
          fc.integer({ min: 2, max: 10 }),
          (key, spawnCount) => {
            const testTensionSystem = createTensionSystem();
            testTensionSystem.init(mockTensionCurve);
            const testSystem = createEchoSystem();
            testSystem.initialize(mockScene, testTensionSystem);

            testTensionSystem.setTension(0.0);

            // Spawn echo multiple times for the same key
            for (let i = 0; i < spawnCount; i++) {
              testSystem.spawnEcho(key, { x: 0, y: 0, z: 0 });
            }

            // Tension should only increase once (0.012)
            expect(testTensionSystem.currentTension).toBeCloseTo(0.012, 5);

            testSystem.dispose();
            testTensionSystem.dispose();
          },
        ),
      );
    });
  });
});
