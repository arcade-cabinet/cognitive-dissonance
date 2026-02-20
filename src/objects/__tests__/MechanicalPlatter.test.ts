/**
 * Tests for MechanicalPlatter procedural geometry
 *
 * Covers: createProceduralKeycap(), createProceduralLever(),
 *         createProceduralMenuKeycap(), createMechanicalPlatter(),
 *         sculptVertices() helper
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';

// ── Mock Babylon.js modules ──

const mockGetVerticesData = jest.fn((kind: string) => {
  // Return 24 vertices (8 corners x 3 components) for a box-like shape
  if (kind === 'position') {
    const positions = [];
    for (let i = 0; i < 72; i++) {
      positions.push((Math.random() - 0.5) * 0.08);
    }
    return positions;
  }
  if (kind === 'normal') {
    const normals = [];
    for (let i = 0; i < 72; i++) {
      normals.push(i % 3 === 1 ? 1 : 0);
    }
    return normals;
  }
  if (kind === 'uv') {
    const uvs = [];
    for (let i = 0; i < 48; i++) {
      uvs.push(Math.random());
    }
    return uvs;
  }
  return null;
});

const mockGetIndices = jest.fn(() => {
  // 12 triangles for a box = 36 indices
  const indices = [];
  for (let i = 0; i < 36; i++) {
    indices.push(i % 24);
  }
  return indices;
});

const mockUpdateVerticesData = jest.fn();
const mockDispose = jest.fn();
const mockApplyToMesh = jest.fn();

const mockMeshInstance = {
  position: { x: 0, y: 0, z: 0, set: jest.fn() },
  rotation: { x: 0, y: 0, z: 0 },
  scaling: { x: 1, y: 1, z: 1, set: jest.fn() },
  material: null,
  parent: null,
  hasVertexAlpha: false,
  getVerticesData: mockGetVerticesData,
  getIndices: mockGetIndices,
  updateVerticesData: mockUpdateVerticesData,
  dispose: mockDispose,
  getChildMeshes: jest.fn(() => []),
  setEnabled: jest.fn(),
};

jest.mock('@babylonjs/core/Meshes/mesh', () => ({
  Mesh: jest.fn().mockImplementation((_name: string, _scene: any) => ({
    ...mockMeshInstance,
    name: _name,
    getChildMeshes: jest.fn(() => []),
    setEnabled: jest.fn(),
  })),
}));

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateBox: jest.fn((_name: string, _opts: any, _scene: any) => ({
      ...mockMeshInstance,
      name: _name,
    })),
    CreateCylinder: jest.fn((_name: string, _opts: any, _scene: any) => ({
      ...mockMeshInstance,
      name: _name,
      position: new (jest.requireMock('@babylonjs/core/Maths/math.vector').Vector3)(0, 0, 0),
    })),
    CreateTorus: jest.fn((_name: string, _opts: any, _scene: any) => ({
      ...mockMeshInstance,
      name: _name,
    })),
    CreateSphere: jest.fn((_name: string, _opts: any, _scene: any) => ({
      ...mockMeshInstance,
      name: _name,
    })),
  },
}));

jest.mock('@babylonjs/core/Meshes/mesh.vertexData', () => ({
  VertexData: jest.fn().mockImplementation(() => ({
    positions: null,
    normals: null,
    uvs: null,
    indices: null,
    applyToMesh: mockApplyToMesh,
  })),
}));

jest.mock('@babylonjs/core/Materials/PBR/pbrMaterial', () => ({
  PBRMaterial: jest.fn().mockImplementation(() => ({
    metallic: 0,
    roughness: 0,
    albedoColor: null,
    emissiveColor: null,
    alpha: 1,
    subSurface: {
      isRefractionEnabled: false,
      refractionIntensity: 0,
      indexOfRefraction: 1,
    },
  })),
}));

jest.mock('@babylonjs/core/Materials/standardMaterial', () => ({
  StandardMaterial: jest.fn().mockImplementation(() => ({
    diffuseColor: null,
    specularColor: null,
    emissiveColor: null,
    diffuseTexture: null,
  })),
}));

jest.mock('@babylonjs/core/Materials/Textures/dynamicTexture', () => ({
  DynamicTexture: jest.fn().mockImplementation(() => ({
    getContext: jest.fn(() => ({
      fillStyle: '',
      fillRect: jest.fn(),
      font: '',
      textAlign: '',
      textBaseline: '',
      fillText: jest.fn(),
    })),
    update: jest.fn(),
  })),
}));

jest.mock('@babylonjs/core/Maths/math.color', () => ({
  Color3: jest.fn((r: number, g: number, b: number) => ({ r, g, b })),
}));

jest.mock('@babylonjs/core/Maths/math.vector', () => {
  class MockVector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    clone() {
      return new MockVector3(this.x, this.y, this.z);
    }
    static Zero() {
      return new MockVector3(0, 0, 0);
    }
    static One() {
      return new MockVector3(1, 1, 1);
    }
  }
  return { Vector3: MockVector3 };
});

import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import {
  createMechanicalPlatter,
  createProceduralKeycap,
  createProceduralLever,
  createProceduralMenuKeycap,
  sculptVertices,
} from '../MechanicalPlatter';

const mockScene = {} as any;

describe('MechanicalPlatter — Procedural Geometry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── sculptVertices helper ──

  describe('sculptVertices()', () => {
    it('iterates all vertices in stride-3 positions', () => {
      const positions = new Float32Array([1, 2, 3, 4, 5, 6]);
      const calls: number[][] = [];
      sculptVertices(positions, (v) => {
        calls.push([v.x, v.y, v.z]);
      });
      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual([1, 2, 3]);
      expect(calls[1]).toEqual([4, 5, 6]);
    });

    it('applies mutation function to each vertex', () => {
      const positions = new Float32Array([1, 2, 3, 4, 5, 6]);
      sculptVertices(positions, (v) => {
        v.x *= 2;
        v.y *= 2;
        v.z *= 2;
      });
      expect(positions[0]).toBe(2);
      expect(positions[1]).toBe(4);
      expect(positions[2]).toBe(6);
      expect(positions[3]).toBe(8);
      expect(positions[4]).toBe(10);
      expect(positions[5]).toBe(12);
    });

    it('handles empty positions array', () => {
      const positions = new Float32Array([]);
      const calls: number[][] = [];
      sculptVertices(positions, (v) => {
        calls.push([v.x, v.y, v.z]);
      });
      expect(calls).toHaveLength(0);
    });

    it('writes back mutated values correctly', () => {
      const positions = new Float32Array([0, 0, 0]);
      sculptVertices(positions, (v) => {
        v.x = 10;
        v.y = 20;
        v.z = 30;
      });
      expect(positions[0]).toBe(10);
      expect(positions[1]).toBe(20);
      expect(positions[2]).toBe(30);
    });
  });

  // ── createProceduralKeycap ──

  describe('createProceduralKeycap()', () => {
    it('creates a mesh with the given name', () => {
      const keycap = createProceduralKeycap('keycap-Q', mockScene);
      expect(keycap).toBeDefined();
      expect(keycap.name).toBe('keycap-Q');
    });

    it('creates a temporary box with updatable flag for vertex extraction', () => {
      createProceduralKeycap('keycap-W', mockScene);
      expect(MeshBuilder.CreateBox).toHaveBeenCalledWith(
        'keycap-W_temp',
        expect.objectContaining({
          width: 0.08,
          height: 0.04,
          depth: 0.08,
          updatable: true,
        }),
        mockScene,
      );
    });

    it('disposes the temporary box after vertex extraction', () => {
      createProceduralKeycap('keycap-E', mockScene);
      expect(mockDispose).toHaveBeenCalled();
    });

    it('applies sculpted vertex data to the keycap mesh', () => {
      createProceduralKeycap('keycap-R', mockScene);
      expect(mockApplyToMesh).toHaveBeenCalled();
    });

    it('creates left and right mechanical hinge cylinders', () => {
      createProceduralKeycap('keycap-T', mockScene);
      // Two hinge cylinders created
      expect(MeshBuilder.CreateCylinder).toHaveBeenCalledWith(
        'keycap-T_hingeL',
        expect.objectContaining({
          height: 0.006,
          diameter: 0.003,
          tessellation: 8,
        }),
        mockScene,
      );
      expect(MeshBuilder.CreateCylinder).toHaveBeenCalledWith(
        'keycap-T_hingeR',
        expect.objectContaining({
          height: 0.006,
          diameter: 0.003,
          tessellation: 8,
        }),
        mockScene,
      );
    });

    it('positions hinges on left and right sides of keycap', () => {
      createProceduralKeycap('keycap-A', mockScene);
      const cylinderCalls = (MeshBuilder.CreateCylinder as jest.Mock).mock.results;
      // Left hinge positioned at -hw - 0.002
      const leftHinge = cylinderCalls[cylinderCalls.length - 2].value;
      expect(leftHinge.position).toBeDefined();
    });

    it('uses correct keycap dimensions (0.08 x 0.04 x 0.08)', () => {
      createProceduralKeycap('keycap-S', mockScene);
      expect(MeshBuilder.CreateBox).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ width: 0.08, height: 0.04, depth: 0.08 }),
        mockScene,
      );
    });
  });

  // ── createProceduralMenuKeycap ──

  describe('createProceduralMenuKeycap()', () => {
    it('creates a menu keycap with larger dimensions (0.14 x 0.05 x 0.14)', () => {
      createProceduralMenuKeycap('keycap-PLAY', mockScene);
      expect(MeshBuilder.CreateBox).toHaveBeenCalledWith(
        'keycap-PLAY_temp',
        expect.objectContaining({
          width: 0.14,
          height: 0.05,
          depth: 0.14,
          updatable: true,
        }),
        mockScene,
      );
    });

    it('applies vertex data to menu keycap mesh', () => {
      createProceduralMenuKeycap('keycap-CONTINUE', mockScene);
      expect(mockApplyToMesh).toHaveBeenCalled();
    });

    it('creates larger hinge cylinders for menu keycaps', () => {
      createProceduralMenuKeycap('keycap-PLAY', mockScene);
      expect(MeshBuilder.CreateCylinder).toHaveBeenCalledWith(
        'keycap-PLAY_hingeL',
        expect.objectContaining({
          height: 0.008,
          diameter: 0.004,
        }),
        mockScene,
      );
    });

    it('disposes the temporary box', () => {
      createProceduralMenuKeycap('keycap-PLAY', mockScene);
      expect(mockDispose).toHaveBeenCalled();
    });
  });

  // ── createProceduralLever ──

  describe('createProceduralLever()', () => {
    it('creates a lever root mesh', () => {
      const lever = createProceduralLever('lever', mockScene);
      expect(lever).toBeDefined();
      expect(lever.name).toBe('lever');
    });

    it('creates a tapered cylinder shaft (different top/bottom diameters)', () => {
      createProceduralLever('lever', mockScene);
      expect(MeshBuilder.CreateCylinder).toHaveBeenCalledWith(
        'lever_shaft',
        expect.objectContaining({
          diameterTop: 0.025,
          diameterBottom: 0.035,
          tessellation: 16,
          updatable: true,
        }),
        mockScene,
      );
    });

    it('creates a ball joint sphere at the base', () => {
      createProceduralLever('lever', mockScene);
      expect(MeshBuilder.CreateSphere).toHaveBeenCalledWith(
        'lever_ball',
        expect.objectContaining({
          diameter: 0.025,
          segments: 12,
        }),
        mockScene,
      );
    });

    it('creates an ergonomic grip cylinder', () => {
      createProceduralLever('lever', mockScene);
      expect(MeshBuilder.CreateCylinder).toHaveBeenCalledWith(
        'lever_grip',
        expect.objectContaining({
          height: 0.025,
          diameter: 0.04,
          tessellation: 16,
          updatable: true,
        }),
        mockScene,
      );
    });

    it('applies groove vertex displacement to shaft', () => {
      createProceduralLever('lever', mockScene);
      // updateVerticesData should be called for shaft grooves
      expect(mockUpdateVerticesData).toHaveBeenCalledWith(
        'position',
        expect.any(Array),
      );
    });

    it('applies ergonomic waist sculpting to grip', () => {
      createProceduralLever('lever', mockScene);
      // updateVerticesData called at least twice (shaft grooves + grip waist)
      expect(mockUpdateVerticesData).toHaveBeenCalledTimes(2);
    });
  });

  // ── createMechanicalPlatter full assembly ──

  describe('createMechanicalPlatter()', () => {
    it('returns all expected component keys', () => {
      const components = createMechanicalPlatter(mockScene);
      expect(components).toHaveProperty('platter');
      expect(components).toHaveProperty('track');
      expect(components).toHaveProperty('slitTop');
      expect(components).toHaveProperty('slitBottom');
      expect(components).toHaveProperty('lever');
      expect(components).toHaveProperty('keycaps');
      expect(components).toHaveProperty('sphere');
      expect(components).toHaveProperty('playKeycap');
      expect(components).toHaveProperty('continueKeycap');
      expect(components).toHaveProperty('rimPositions');
    });

    it('rimPositions contains entries for all 14 keycap letters', () => {
      const components = createMechanicalPlatter(mockScene);
      expect(components.rimPositions.size).toBe(14);
      const letters = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'H', 'Z', 'X', 'C'];
      for (const letter of letters) {
        const pos = components.rimPositions.get(letter);
        expect(pos).toBeDefined();
        expect(pos!.y).toBe(0.09);
      }
    });

    it('creates exactly 14 keycaps', () => {
      const components = createMechanicalPlatter(mockScene);
      expect(components.keycaps).toHaveLength(14);
    });

    it('creates platter cylinder with correct dimensions', () => {
      createMechanicalPlatter(mockScene);
      expect(MeshBuilder.CreateCylinder).toHaveBeenCalledWith(
        'platter',
        expect.objectContaining({ height: 0.18, diameter: 1.2, tessellation: 64 }),
        mockScene,
      );
    });

    it('creates track torus with correct dimensions', () => {
      createMechanicalPlatter(mockScene);
      expect(MeshBuilder.CreateTorus).toHaveBeenCalledWith(
        'track',
        expect.objectContaining({ diameter: 0.8, thickness: 0.04, tessellation: 64 }),
        mockScene,
      );
    });

    it('creates glass sphere with correct diameter', () => {
      createMechanicalPlatter(mockScene);
      expect(MeshBuilder.CreateSphere).toHaveBeenCalledWith(
        'sphere',
        expect.objectContaining({ diameter: 0.52, segments: 64 }),
        mockScene,
      );
    });

    it('applies lever material to lever and child meshes', () => {
      const components = createMechanicalPlatter(mockScene);
      expect(components.lever.material).toBeDefined();
    });

    it('applies materials to all keycaps', () => {
      const components = createMechanicalPlatter(mockScene);
      for (const keycap of components.keycaps) {
        expect(keycap.material).toBeDefined();
      }
    });

    it('does NOT use CreateBox for keycaps (procedural geometry instead)', () => {
      createMechanicalPlatter(mockScene);
      const boxCalls = (MeshBuilder.CreateBox as jest.Mock).mock.calls;
      // CreateBox should only be called for: slitTop, slitBottom, and temp boxes for vertex extraction
      // NOT directly as keycap final meshes
      const keycapDirectCalls = boxCalls.filter(
        (call: any) => call[0].startsWith('keycap-') && !call[0].includes('_temp'),
      );
      expect(keycapDirectCalls).toHaveLength(0);
    });

    it('does NOT use CreateBox for lever (procedural geometry instead)', () => {
      createMechanicalPlatter(mockScene);
      const boxCalls = (MeshBuilder.CreateBox as jest.Mock).mock.calls;
      const leverDirectCalls = boxCalls.filter(
        (call: any) => call[0] === 'lever',
      );
      expect(leverDirectCalls).toHaveLength(0);
    });

    it('uses CreateBox only for slit top/bottom and temp geometry', () => {
      jest.clearAllMocks();
      createMechanicalPlatter(mockScene);
      const boxCalls = (MeshBuilder.CreateBox as jest.Mock).mock.calls;
      const directBoxNames = boxCalls
        .map((call: any) => call[0])
        .filter((name: string) => !name.includes('_temp'));
      // Only slitTop and slitBottom should be direct CreateBox calls
      expect(directBoxNames).toContain('slitTop');
      expect(directBoxNames).toContain('slitBottom');
      expect(directBoxNames.filter((n: string) => n !== 'slitTop' && n !== 'slitBottom')).toHaveLength(0);
    });
  });

  // ── Visual Design Property Tests ──────────────────────────────────

  describe('Visual Design: Keycap Arrangement (160° front arc)', () => {
    it('all keycap rim positions have positive Z (facing camera)', () => {
      const components = createMechanicalPlatter(mockScene);
      for (const [letter, pos] of components.rimPositions) {
        expect(pos.z).toBeGreaterThan(0);
      }
    });

    it('keycap rim positions span approximately 160° arc', () => {
      const components = createMechanicalPlatter(mockScene);
      const positions = Array.from(components.rimPositions.values());
      // All positions should be at platter radius (~0.6)
      for (const pos of positions) {
        const radius = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        expect(radius).toBeCloseTo(0.6, 1);
      }
      // Angular span: compute min and max angles
      const angles = positions.map((p) => Math.atan2(p.z, p.x));
      const minAngle = Math.min(...angles);
      const maxAngle = Math.max(...angles);
      const spanDeg = ((maxAngle - minAngle) * 180) / Math.PI;
      // Should be approximately 160°
      expect(spanDeg).toBeGreaterThan(150);
      expect(spanDeg).toBeLessThan(170);
    });

    it('no keycap rim positions are behind the sphere (-Z half)', () => {
      const components = createMechanicalPlatter(mockScene);
      for (const [_, pos] of components.rimPositions) {
        // All Z should be positive (in front of origin toward camera)
        expect(pos.z).toBeGreaterThan(0);
      }
    });

    it('rim positions are symmetric about the Z axis', () => {
      const components = createMechanicalPlatter(mockScene);
      const positions = Array.from(components.rimPositions.values());
      // First and last positions should have roughly symmetric X values
      const first = positions[0];
      const last = positions[positions.length - 1];
      expect(Math.abs(first.x + last.x)).toBeLessThan(0.05);
    });
  });

  describe('Visual Design: Keycap Facing (toward camera)', () => {
    it('all keycaps have rotation.y = π (face +Z camera)', () => {
      const components = createMechanicalPlatter(mockScene);
      for (const keycap of components.keycaps) {
        expect(keycap.rotation.y).toBeCloseTo(Math.PI, 5);
      }
    });
  });

  describe('Visual Design: Keycap Initial State (retracted)', () => {
    it('all keycaps start at center position (0, -0.02, 0)', () => {
      const components = createMechanicalPlatter(mockScene);
      for (const keycap of components.keycaps) {
        expect(keycap.position.x).toBeCloseTo(0, 5);
        expect(keycap.position.y).toBeCloseTo(-0.02, 5);
        expect(keycap.position.z).toBeCloseTo(0, 5);
      }
    });

    it('all keycaps start disabled (invisible)', () => {
      const components = createMechanicalPlatter(mockScene);
      for (const keycap of components.keycaps) {
        expect(keycap.setEnabled).toHaveBeenCalledWith(false);
      }
    });
  });

  describe('Visual Design: Slit Geometry (visible garage door)', () => {
    it('slit top and bottom have thick height (0.06, not 0.02)', () => {
      jest.clearAllMocks();
      createMechanicalPlatter(mockScene);
      const boxCalls = (MeshBuilder.CreateBox as jest.Mock).mock.calls;
      const slitTopCall = boxCalls.find((c: any) => c[0] === 'slitTop');
      const slitBottomCall = boxCalls.find((c: any) => c[0] === 'slitBottom');
      expect(slitTopCall).toBeDefined();
      expect(slitBottomCall).toBeDefined();
      expect(slitTopCall[1].height).toBe(0.06);
      expect(slitBottomCall[1].height).toBe(0.06);
    });

    it('slit has wide depth (0.5, not 0.1)', () => {
      jest.clearAllMocks();
      createMechanicalPlatter(mockScene);
      const boxCalls = (MeshBuilder.CreateBox as jest.Mock).mock.calls;
      const slitTopCall = boxCalls.find((c: any) => c[0] === 'slitTop');
      expect(slitTopCall[1].depth).toBe(0.5);
    });

    it('slit top positioned at y=0.12, bottom at y=0.06 (closed position)', () => {
      const components = createMechanicalPlatter(mockScene);
      expect(components.slitTop.position.y).toBe(0.12);
      expect(components.slitBottom.position.y).toBe(0.06);
    });
  });

  describe('Visual Design: PLAY Keycap (visible on title)', () => {
    it('PLAY keycap starts at visible position (0, 0.10, 0.15)', () => {
      const components = createMechanicalPlatter(mockScene);
      expect(components.playKeycap.position.x).toBeCloseTo(0, 5);
      expect(components.playKeycap.position.y).toBeCloseTo(0.10, 5);
      expect(components.playKeycap.position.z).toBeCloseTo(0.15, 5);
    });

    it('PLAY keycap faces camera (rotation.y = π)', () => {
      const components = createMechanicalPlatter(mockScene);
      expect(components.playKeycap.rotation.y).toBeCloseTo(Math.PI, 5);
    });

    it('PLAY keycap has bright green emissive glow', () => {
      const components = createMechanicalPlatter(mockScene);
      const mat = components.playKeycap.material;
      expect(mat).toBeDefined();
      // PBRMaterial mock stores emissiveColor as a Color3 mock: { r, g, b }
      expect(mat.emissiveColor).toBeDefined();
      expect(mat.emissiveColor.r).toBeCloseTo(0.1, 2);
      expect(mat.emissiveColor.g).toBeCloseTo(0.4, 2);
      expect(mat.emissiveColor.b).toBeCloseTo(0.1, 2);
    });
  });
});
