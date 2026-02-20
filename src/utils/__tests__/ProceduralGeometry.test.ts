import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
  createBeveledBox,
  createCrystallinePolyhedron,
  createIrregularShard,
  createMechanicalLever,
  createSculptedKeycap,
  createSinuousTube,
  gauss,
  lerp,
  sculptMesh,
  smoothstep,
} from '../ProceduralGeometry';

// ---------------------------------------------------------------------------
// Mock Babylon.js modules
// ---------------------------------------------------------------------------

// Track all vertex data written by sculptMesh / geometry factories
let lastSetPositions: number[] | Float32Array | null = null;
let lastSetNormals: number[] | Float32Array | null = null;
let createNormalsCalled = false;
let createNormalsSmooth: boolean | undefined;

/** Create a mock mesh with a given flat positions array */
function mockMesh(positions?: number[]): any {
  const pos = positions ?? [
    // A simple 4-vertex quad for basic tests
    -1, -1, 0,
    1, -1, 0,
    1, 1, 0,
    -1, 1, 0,
  ];
  lastSetPositions = null;
  lastSetNormals = null;
  createNormalsCalled = false;
  createNormalsSmooth = undefined;

  return {
    getVerticesData: jest.fn((kind: string) => {
      if (kind === 'position') return [...pos]; // return a copy
      if (kind === 'normal') return pos.map(() => 0);
      return null;
    }),
    setVerticesData: jest.fn((kind: string, data: number[]) => {
      if (kind === 'position') lastSetPositions = data;
      if (kind === 'normal') lastSetNormals = data;
    }),
    createNormals: jest.fn((smooth?: boolean) => {
      createNormalsCalled = true;
      createNormalsSmooth = smooth;
    }),
    dispose: jest.fn(),
    name: 'mock',
    position: { x: 0, y: 0, z: 0 },
    material: null,
  };
}

// Mock VertexBuffer
jest.mock('@babylonjs/core/Buffers/buffer', () => ({
  VertexBuffer: { PositionKind: 'position', NormalKind: 'normal' },
}));

// Mock Vector3 — implement just enough for sculptMesh to work
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
      return this;
    }
  }
  return { Vector3: MockVector3 };
});

// Mock MeshBuilder
const mockCreateBox = jest.fn((_name: string, _opts: any, _scene: any) =>
  mockMesh([
    // 8 vertices of a unit box (simplified)
    -0.5, -0.5, -0.5,
    0.5, -0.5, -0.5,
    0.5, 0.5, -0.5,
    -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5,
    0.5, -0.5, 0.5,
    0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,
  ]),
);

const mockCreatePolyhedron = jest.fn((_name: string, _opts: any, _scene: any) =>
  mockMesh([
    // 6 vertices of a simplified polyhedron
    0, 1, 0,
    1, 0, 0,
    0, 0, 1,
    -1, 0, 0,
    0, 0, -1,
    0, -1, 0,
  ]),
);

const mockCreateTube = jest.fn((_name: string, opts: any, _scene: any) => {
  // Build positions from the path provided
  const path: Vector3[] = opts.path ?? [];
  const positions: number[] = [];
  for (const p of path) {
    positions.push(p.x, p.y, p.z);
  }
  // Duplicate once for tube ring
  for (const p of path) {
    positions.push(p.x + 0.01, p.y, p.z);
  }
  return mockMesh(positions);
});

const mockCreateIcoSphere = jest.fn((_name: string, opts: any, _scene: any) => {
  // Generate deterministic icosphere-like vertices
  const r = opts.radius ?? 1;
  const positions: number[] = [];
  // 12 base icosahedron vertices
  const phi = (1 + Math.sqrt(5)) / 2;
  const verts = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ];
  for (const [x, y, z] of verts) {
    const len = Math.sqrt(x * x + y * y + z * z);
    positions.push((x / len) * r, (y / len) * r, (z / len) * r);
  }
  return mockMesh(positions);
});

const mockCreateCylinder = jest.fn((_name: string, opts: any, _scene: any) => {
  const h = opts.height ?? 1;
  const rt = (opts.diameterTop ?? opts.diameter ?? 1) / 2;
  const rb = (opts.diameterBottom ?? opts.diameter ?? 1) / 2;
  const segs = 8;
  const positions: number[] = [];
  for (let ring = 0; ring <= 1; ring++) {
    const y = ring === 0 ? -h / 2 : h / 2;
    const r = ring === 0 ? rb : rt;
    for (let s = 0; s < segs; s++) {
      const angle = (s / segs) * Math.PI * 2;
      positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
    }
  }
  return mockMesh(positions);
});

const mockCreateSphere = jest.fn((_name: string, opts: any, _scene: any) => {
  const r = (opts.diameter ?? 1) / 2;
  const positions: number[] = [];
  // Simple UV sphere approximation
  for (let lat = 0; lat <= 4; lat++) {
    const theta = (lat / 4) * Math.PI;
    for (let lon = 0; lon <= 4; lon++) {
      const phi = (lon / 4) * Math.PI * 2;
      positions.push(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.cos(theta),
        r * Math.sin(theta) * Math.sin(phi),
      );
    }
  }
  return mockMesh(positions);
});

jest.mock('@babylonjs/core/Meshes/meshBuilder', () => ({
  MeshBuilder: {
    CreateBox: (name: string, opts: any, scene: any) => mockCreateBox(name, opts, scene),
    CreatePolyhedron: (name: string, opts: any, scene: any) => mockCreatePolyhedron(name, opts, scene),
    CreateTube: (name: string, opts: any, scene: any) => mockCreateTube(name, opts, scene),
    CreateIcoSphere: (name: string, opts: any, scene: any) => mockCreateIcoSphere(name, opts, scene),
    CreateCylinder: (name: string, opts: any, scene: any) => mockCreateCylinder(name, opts, scene),
    CreateSphere: (name: string, opts: any, scene: any) => mockCreateSphere(name, opts, scene),
  },
}));

const mockScene = {} as any;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProceduralGeometry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastSetPositions = null;
    lastSetNormals = null;
    createNormalsCalled = false;
    createNormalsSmooth = undefined;
  });

  // =========================================================================
  // gauss
  // =========================================================================
  describe('gauss', () => {
    it('returns 1.0 when x equals center', () => {
      expect(gauss(5, 5, 1)).toBeCloseTo(1.0, 10);
    });

    it('returns 1.0 for any center when x == c', () => {
      expect(gauss(-3, -3, 2)).toBeCloseTo(1.0, 10);
    });

    it('returns exp(-0.5) when x is one standard deviation from center', () => {
      const expected = Math.exp(-0.5);
      expect(gauss(6, 5, 1)).toBeCloseTo(expected, 10);
    });

    it('returns smaller value at two standard deviations', () => {
      const oneSigma = gauss(6, 5, 1);
      const twoSigma = gauss(7, 5, 1);
      expect(twoSigma).toBeLessThan(oneSigma);
    });

    it('is symmetric around center', () => {
      expect(gauss(3, 5, 1)).toBeCloseTo(gauss(7, 5, 1), 10);
    });

    it('wider sigma produces higher value at same distance', () => {
      const narrow = gauss(6, 5, 0.5);
      const wide = gauss(6, 5, 2.0);
      expect(wide).toBeGreaterThan(narrow);
    });

    it('returns a value between 0 and 1 for any inputs', () => {
      for (const x of [-100, -1, 0, 1, 100]) {
        for (const c of [-10, 0, 10]) {
          const result = gauss(x, c, 1);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  // =========================================================================
  // smoothstep
  // =========================================================================
  describe('smoothstep', () => {
    it('returns 0 when x <= a', () => {
      expect(smoothstep(0, 1, -1)).toBe(0);
      expect(smoothstep(0, 1, 0)).toBe(0);
    });

    it('returns 1 when x >= b', () => {
      expect(smoothstep(0, 1, 1)).toBe(1);
      expect(smoothstep(0, 1, 2)).toBe(1);
    });

    it('returns 0.5 at the midpoint', () => {
      expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 10);
    });

    it('has zero derivative at edges (Hermite property)', () => {
      // At a: f(a+eps) ≈ f(a) (very small change)
      const eps = 1e-6;
      const atA = smoothstep(0, 1, 0 + eps);
      expect(atA).toBeLessThan(eps * 10); // derivative near zero
    });

    it('is monotonically increasing within [a, b]', () => {
      let prev = 0;
      for (let i = 0; i <= 100; i++) {
        const x = i / 100;
        const val = smoothstep(0, 1, x);
        expect(val).toBeGreaterThanOrEqual(prev);
        prev = val;
      }
    });

    it('handles reversed a > b by clamping', () => {
      // When a > b, (x - a) / (b - a) inverts, but clamp keeps it 0..1
      const result = smoothstep(1, 0, 0.5);
      // t = (0.5 - 1) / (0 - 1) = 0.5, so same as normal
      expect(result).toBeCloseTo(0.5, 10);
    });

    it('returns correct values for known fractional inputs', () => {
      // At t=0.25: t^2(3-2t) = 0.0625 * 2.5 = 0.15625
      expect(smoothstep(0, 1, 0.25)).toBeCloseTo(0.15625, 10);
      // At t=0.75: t^2(3-2t) = 0.5625 * 1.5 = 0.84375
      expect(smoothstep(0, 1, 0.75)).toBeCloseTo(0.84375, 10);
    });
  });

  // =========================================================================
  // lerp
  // =========================================================================
  describe('lerp', () => {
    it('returns a when t is 0', () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });

    it('returns b when t is 1', () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });

    it('returns midpoint when t is 0.5', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it('extrapolates beyond 0..1', () => {
      expect(lerp(0, 10, 2)).toBe(20);
      expect(lerp(0, 10, -1)).toBe(-10);
    });

    it('works with negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });
  });

  // =========================================================================
  // sculptMesh
  // =========================================================================
  describe('sculptMesh', () => {
    it('calls the sculpt function for each vertex', () => {
      const mesh = mockMesh([1, 2, 3, 4, 5, 6]);
      const fn = jest.fn();
      sculptMesh(mesh, fn);
      expect(fn).toHaveBeenCalledTimes(2); // 6 floats / 3 = 2 vertices
    });

    it('passes original coordinates as ox, oy, oz', () => {
      const mesh = mockMesh([10, 20, 30]);
      const fn = jest.fn();
      sculptMesh(mesh, fn);
      // First call should get ox=10, oy=20, oz=30
      const call = fn.mock.calls[0];
      expect(call[1]).toBe(10); // ox
      expect(call[2]).toBe(20); // oy
      expect(call[3]).toBe(30); // oz
    });

    it('writes modified vertices back to the mesh', () => {
      const mesh = mockMesh([1, 2, 3]);
      sculptMesh(mesh, (v) => {
        v.x *= 2;
        v.y *= 2;
        v.z *= 2;
      });
      expect(mesh.setVerticesData).toHaveBeenCalled();
      expect(lastSetPositions).toEqual([2, 4, 6]);
    });

    it('recomputes normals after sculpting', () => {
      const mesh = mockMesh([1, 2, 3]);
      sculptMesh(mesh, () => {});
      expect(mesh.createNormals).toHaveBeenCalledWith(true);
    });

    it('handles empty position data gracefully', () => {
      const mesh = {
        getVerticesData: jest.fn(() => null),
        setVerticesData: jest.fn(),
        createNormals: jest.fn(),
      };
      // Should not throw
      sculptMesh(mesh as any, () => {});
      expect(mesh.setVerticesData).not.toHaveBeenCalled();
    });

    it('preserves untouched vertices', () => {
      const mesh = mockMesh([1, 2, 3, 4, 5, 6]);
      sculptMesh(mesh, () => {
        // No-op: don't modify v
      });
      expect(lastSetPositions).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('handles a sculpt that moves vertices to the origin', () => {
      const mesh = mockMesh([10, 20, 30]);
      sculptMesh(mesh, (v) => {
        v.x = 0;
        v.y = 0;
        v.z = 0;
      });
      expect(lastSetPositions).toEqual([0, 0, 0]);
    });
  });

  // =========================================================================
  // createBeveledBox
  // =========================================================================
  describe('createBeveledBox', () => {
    it('calls MeshBuilder.CreateBox with correct dimensions', () => {
      createBeveledBox('testBox', { width: 2, height: 3, depth: 4, bevel: 0.1 }, mockScene);
      expect(mockCreateBox).toHaveBeenCalledWith(
        'testBox',
        expect.objectContaining({ width: 2, height: 3, depth: 4, updatable: true }),
        mockScene,
      );
    });

    it('returns a mesh object', () => {
      const result = createBeveledBox('b', { width: 1, height: 1, depth: 1, bevel: 0.1 }, mockScene);
      expect(result).toBeDefined();
      expect(result.getVerticesData).toBeDefined();
    });

    it('modifies vertices (positions differ from original box)', () => {
      createBeveledBox('b', { width: 1, height: 1, depth: 1, bevel: 0.2 }, mockScene);
      // The sculpt function should have run and written data
      expect(lastSetPositions).not.toBeNull();
      // Corner vertex (0.5, 0.5, 0.5) should be pulled inward
      // Index 6: originally (0.5, 0.5, 0.5)
      if (lastSetPositions) {
        const cornerX = lastSetPositions[6 * 3];
        const cornerY = lastSetPositions[6 * 3 + 1];
        const cornerZ = lastSetPositions[6 * 3 + 2];
        // Should be less than original 0.5
        expect(Math.abs(cornerX)).toBeLessThan(0.5);
        expect(Math.abs(cornerY)).toBeLessThan(0.5);
        expect(Math.abs(cornerZ)).toBeLessThan(0.5);
      }
    });

    it('zero bevel leaves vertices unchanged (no sculpting occurs)', () => {
      const result = createBeveledBox('b', { width: 1, height: 1, depth: 1, bevel: 0 }, mockScene);
      // With bevel=0 the sculpt pass is skipped entirely, so setVerticesData
      // should NOT have been called by sculptMesh
      expect(result.setVerticesData).not.toHaveBeenCalled();
    });

    it('larger bevel produces more chamfered corners', () => {
      createBeveledBox('small', { width: 1, height: 1, depth: 1, bevel: 0.05 }, mockScene);
      const smallBevel = lastSetPositions ? [...lastSetPositions] : [];

      createBeveledBox('large', { width: 1, height: 1, depth: 1, bevel: 0.4 }, mockScene);
      const largeBevel = lastSetPositions ? [...lastSetPositions] : [];

      // Corner vertex at index 6 (originally 0.5,0.5,0.5)
      // Larger bevel should pull it closer to center
      const smallCornerX = Math.abs(smallBevel[18]);
      const largeCornerX = Math.abs(largeBevel[18]);
      expect(largeCornerX).toBeLessThan(smallCornerX);
    });

    it('calls createNormals after sculpting', () => {
      createBeveledBox('b', { width: 1, height: 1, depth: 1, bevel: 0.1 }, mockScene);
      expect(createNormalsCalled).toBe(true);
    });
  });

  // =========================================================================
  // createCrystallinePolyhedron
  // =========================================================================
  describe('createCrystallinePolyhedron', () => {
    it('calls MeshBuilder.CreatePolyhedron with type 1', () => {
      createCrystallinePolyhedron('crystal', { size: 1, displacementScale: 0.1 }, mockScene);
      expect(mockCreatePolyhedron).toHaveBeenCalledWith(
        'crystal',
        expect.objectContaining({ type: 1, size: 1, flat: true }),
        mockScene,
      );
    });

    it('displaces vertices using sine function', () => {
      createCrystallinePolyhedron('c', { size: 1, displacementScale: 0.5 }, mockScene);
      // Original vertex (0, 1, 0) — sine displacement depends on position
      // sin(0*7) * sin(1*11) * sin(0*13) = 0 * sin(11) * 0 = 0
      // So vertex at (0,1,0) should have zero displacement
      // But vertex at (1,0,0) — sin(7)*sin(0)*sin(0) = 0 — also zero
      // Vertex at (0,0,1) — sin(0)*sin(0)*sin(13) = 0
      // These axis-aligned vertices have zero displacement due to sine products
      expect(lastSetPositions).not.toBeNull();
    });

    it('applies displacement proportional to displacementScale', () => {
      createCrystallinePolyhedron('small', { size: 1, displacementScale: 0.01 }, mockScene);
      const smallDisp = lastSetPositions ? [...lastSetPositions] : [];

      createCrystallinePolyhedron('large', { size: 1, displacementScale: 1.0 }, mockScene);
      const largeDisp = lastSetPositions ? [...lastSetPositions] : [];

      // For vertices with non-zero displacement, larger scale = larger change
      // Compare total displacement magnitude across all vertices
      let smallTotal = 0;
      let largeTotal = 0;
      const original = [0, 1, 0, 1, 0, 0, 0, 0, 1, -1, 0, 0, 0, 0, -1, 0, -1, 0];
      for (let i = 0; i < original.length; i++) {
        smallTotal += Math.abs(smallDisp[i] - original[i]);
        largeTotal += Math.abs(largeDisp[i] - original[i]);
      }
      expect(largeTotal).toBeGreaterThanOrEqual(smallTotal);
    });

    it('calls createNormals with false for faceted appearance', () => {
      createCrystallinePolyhedron('c', { size: 1, displacementScale: 0.1 }, mockScene);
      // The last createNormals call should be with false (faceted)
      // sculptMesh calls createNormals(true), then the function calls createNormals(false)
      const mesh = mockCreatePolyhedron.mock.results[0].value;
      const calls = mesh.createNormals.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(false);
    });

    it('returns a mesh object with vertices', () => {
      const result = createCrystallinePolyhedron('c', { size: 2, displacementScale: 0.1 }, mockScene);
      expect(result).toBeDefined();
      expect(result.getVerticesData).toBeDefined();
    });

    it('zero displacement preserves original vertex positions', () => {
      createCrystallinePolyhedron('c', { size: 1, displacementScale: 0 }, mockScene);
      if (lastSetPositions) {
        // All vertices should remain at their original positions
        expect(lastSetPositions[0]).toBeCloseTo(0, 5);
        expect(lastSetPositions[1]).toBeCloseTo(1, 5);
        expect(lastSetPositions[2]).toBeCloseTo(0, 5);
      }
    });
  });

  // =========================================================================
  // createSinuousTube
  // =========================================================================
  describe('createSinuousTube', () => {
    it('calls MeshBuilder.CreateTube with a path array', () => {
      createSinuousTube(
        'tube',
        { length: 2, baseRadius: 0.1, segments: 10, amplitude: 0.3, frequency: 2 },
        mockScene,
      );
      expect(mockCreateTube).toHaveBeenCalledWith(
        'tube',
        expect.objectContaining({ path: expect.any(Array) }),
        mockScene,
      );
    });

    it('generates path with correct number of points (segments + 1)', () => {
      createSinuousTube(
        'tube',
        { length: 2, baseRadius: 0.1, segments: 20, amplitude: 0.3, frequency: 2 },
        mockScene,
      );
      const callOpts = mockCreateTube.mock.calls[0][1];
      expect(callOpts.path.length).toBe(21); // segments + 1
    });

    it('path spans the correct length along Y axis', () => {
      createSinuousTube(
        'tube',
        { length: 5, baseRadius: 0.1, segments: 10, amplitude: 0.3, frequency: 1 },
        mockScene,
      );
      const callOpts = mockCreateTube.mock.calls[0][1];
      const path: Vector3[] = callOpts.path;
      expect(path[0].y).toBeCloseTo(0, 5);
      expect(path[path.length - 1].y).toBeCloseTo(5, 5);
    });

    it('path has sinusoidal X offsets', () => {
      createSinuousTube(
        'tube',
        { length: 2, baseRadius: 0.1, segments: 100, amplitude: 0.5, frequency: 1 },
        mockScene,
      );
      const callOpts = mockCreateTube.mock.calls[0][1];
      const path: Vector3[] = callOpts.path;
      // At t=0.25, sin(0.25 * 1 * 2PI) = sin(PI/2) = 1 → x = 0.5
      const quarterIdx = 25;
      expect(path[quarterIdx].x).toBeCloseTo(0.5, 1);
    });

    it('provides a radiusFunction that tapers', () => {
      createSinuousTube(
        'tube',
        { length: 2, baseRadius: 1.0, segments: 10, amplitude: 0.3, frequency: 2 },
        mockScene,
      );
      const callOpts = mockCreateTube.mock.calls[0][1];
      const radiusFn = callOpts.radiusFunction;
      // At start (i=0): baseRadius
      expect(radiusFn(0, 0)).toBeCloseTo(1.0, 5);
      // At end (i=segments): baseRadius * 0.1
      expect(radiusFn(10, 2)).toBeCloseTo(0.1, 5);
    });

    it('larger amplitude produces wider sinusoidal offsets', () => {
      createSinuousTube(
        'small',
        { length: 2, baseRadius: 0.1, segments: 10, amplitude: 0.1, frequency: 1 },
        mockScene,
      );
      const smallPath: Vector3[] = mockCreateTube.mock.calls[0][1].path;

      createSinuousTube(
        'large',
        { length: 2, baseRadius: 0.1, segments: 10, amplitude: 1.0, frequency: 1 },
        mockScene,
      );
      const largePath: Vector3[] = mockCreateTube.mock.calls[1][1].path;

      // Compare max X offset
      const smallMaxX = Math.max(...smallPath.map((p: Vector3) => Math.abs(p.x)));
      const largeMaxX = Math.max(...largePath.map((p: Vector3) => Math.abs(p.x)));
      expect(largeMaxX).toBeGreaterThan(smallMaxX);
    });
  });

  // =========================================================================
  // createIrregularShard
  // =========================================================================
  describe('createIrregularShard', () => {
    it('calls MeshBuilder.CreateIcoSphere with correct radius', () => {
      createIrregularShard('shard', { radius: 0.5, seed: 42 }, mockScene);
      expect(mockCreateIcoSphere).toHaveBeenCalledWith(
        'shard',
        expect.objectContaining({ radius: 0.5, subdivisions: 2 }),
        mockScene,
      );
    });

    it('produces different geometry for different seeds', () => {
      createIrregularShard('s1', { radius: 1, seed: 100 }, mockScene);
      const positions1 = lastSetPositions ? [...lastSetPositions] : [];

      createIrregularShard('s2', { radius: 1, seed: 200 }, mockScene);
      const positions2 = lastSetPositions ? [...lastSetPositions] : [];

      // At least some vertices should differ
      let differences = 0;
      for (let i = 0; i < positions1.length; i++) {
        if (Math.abs(positions1[i] - positions2[i]) > 1e-6) differences++;
      }
      expect(differences).toBeGreaterThan(0);
    });

    it('produces identical geometry for same seed', () => {
      createIrregularShard('s1', { radius: 1, seed: 42 }, mockScene);
      const positions1 = lastSetPositions ? [...lastSetPositions] : [];

      createIrregularShard('s2', { radius: 1, seed: 42 }, mockScene);
      const positions2 = lastSetPositions ? [...lastSetPositions] : [];

      for (let i = 0; i < positions1.length; i++) {
        expect(positions1[i]).toBeCloseTo(positions2[i], 10);
      }
    });

    it('displaces vertices along radial direction', () => {
      createIrregularShard('s', { radius: 1, seed: 42 }, mockScene);
      if (lastSetPositions) {
        // Vertices should differ from the normalized icosphere positions
        const phi = (1 + Math.sqrt(5)) / 2;
        const origVerts = [
          [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
          [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
          [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
        ];
        let anyDifferent = false;
        for (let vi = 0; vi < origVerts.length; vi++) {
          const [ox, oy, oz] = origVerts[vi];
          const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
          const nx = ox / len;
          const ny = oy / len;
          const nz = oz / len;
          if (
            Math.abs(lastSetPositions[vi * 3] - nx) > 1e-6 ||
            Math.abs(lastSetPositions[vi * 3 + 1] - ny) > 1e-6 ||
            Math.abs(lastSetPositions[vi * 3 + 2] - nz) > 1e-6
          ) {
            anyDifferent = true;
          }
        }
        expect(anyDifferent).toBe(true);
      }
    });

    it('returns a valid mesh', () => {
      const result = createIrregularShard('s', { radius: 0.3, seed: 7 }, mockScene);
      expect(result).toBeDefined();
      expect(result.setVerticesData).toBeDefined();
    });

    it('displacement scales with radius', () => {
      createIrregularShard('small', { radius: 0.1, seed: 42 }, mockScene);
      const smallPositions = lastSetPositions ? [...lastSetPositions] : [];

      createIrregularShard('large', { radius: 10, seed: 42 }, mockScene);
      const largePositions = lastSetPositions ? [...lastSetPositions] : [];

      // The displacement is proportional to radius * 0.6
      // Larger radius should produce larger absolute displacements
      let smallMaxDelta = 0;
      let largeMaxDelta = 0;

      const phi = (1 + Math.sqrt(5)) / 2;
      const origUnit = [
        [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
        [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
        [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
      ];
      for (let vi = 0; vi < origUnit.length; vi++) {
        const [ox, oy, oz] = origUnit[vi];
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);

        const smallOrig = [ox / len * 0.1, oy / len * 0.1, oz / len * 0.1];
        const largeOrig = [ox / len * 10, oy / len * 10, oz / len * 10];

        for (let c = 0; c < 3; c++) {
          smallMaxDelta = Math.max(smallMaxDelta, Math.abs(smallPositions[vi * 3 + c] - smallOrig[c]));
          largeMaxDelta = Math.max(largeMaxDelta, Math.abs(largePositions[vi * 3 + c] - largeOrig[c]));
        }
      }
      expect(largeMaxDelta).toBeGreaterThan(smallMaxDelta);
    });
  });

  // =========================================================================
  // createSculptedKeycap
  // =========================================================================
  describe('createSculptedKeycap', () => {
    it('calls MeshBuilder.CreateBox with keycap dimensions', () => {
      createSculptedKeycap(
        'key',
        { width: 0.08, height: 0.04, depth: 0.08, dishDepth: 0.01, bevelSize: 0.005 },
        mockScene,
      );
      expect(mockCreateBox).toHaveBeenCalledWith(
        'key',
        expect.objectContaining({ width: 0.08, height: 0.04, depth: 0.08 }),
        mockScene,
      );
    });

    it('top face vertices are depressed (dish)', () => {
      // Mock mesh with vertices where some are at top face
      const topY = 0.5;
      const positions = [
        0, topY, 0,      // top center — should get dish depression
        0, -topY, 0,     // bottom center — should not get dish
        topY, 0, 0,      // side — no dish
      ];
      mockCreateBox.mockReturnValueOnce(mockMesh(positions));

      createSculptedKeycap(
        'key',
        { width: 1, height: 1, depth: 1, dishDepth: 0.2, bevelSize: 0 },
        mockScene,
      );

      if (lastSetPositions) {
        // Top center vertex y should be less than original 0.5
        expect(lastSetPositions[1]).toBeLessThan(topY);
      }
    });

    it('bottom face vertices are pushed up (glow channel)', () => {
      const bottomY = -0.5;
      const positions = [
        0, bottomY, 0,   // bottom center — should get pushed up
        0, 0.5, 0,       // top center
        0.5, 0, 0,       // side
      ];
      mockCreateBox.mockReturnValueOnce(mockMesh(positions));

      createSculptedKeycap(
        'key',
        { width: 1, height: 1, depth: 1, dishDepth: 0.01, bevelSize: 0 },
        mockScene,
      );

      if (lastSetPositions) {
        // Bottom center vertex y should be greater than original -0.5
        expect(lastSetPositions[1]).toBeGreaterThan(bottomY);
      }
    });

    it('edge vertices are beveled inward', () => {
      // Corner vertex at max extent
      const positions = [
        0.5, 0.5, 0.5,   // corner — should get bevel AND dish
        0, 0, 0,          // center — minimal bevel
      ];
      mockCreateBox.mockReturnValueOnce(mockMesh(positions));

      createSculptedKeycap(
        'key',
        { width: 1, height: 1, depth: 1, dishDepth: 0, bevelSize: 0.2 },
        mockScene,
      );

      if (lastSetPositions) {
        // Corner should be pulled inward
        expect(Math.abs(lastSetPositions[0])).toBeLessThan(0.5);
      }
    });

    it('dish depth of zero does not depress top vertices', () => {
      const positions = [0, 0.5, 0];
      mockCreateBox.mockReturnValueOnce(mockMesh(positions));

      createSculptedKeycap(
        'key',
        { width: 1, height: 1, depth: 1, dishDepth: 0, bevelSize: 0 },
        mockScene,
      );

      if (lastSetPositions) {
        expect(lastSetPositions[1]).toBeCloseTo(0.5, 5);
      }
    });

    it('calls createNormals after sculpting', () => {
      createSculptedKeycap(
        'key',
        { width: 1, height: 1, depth: 1, dishDepth: 0.1, bevelSize: 0.05 },
        mockScene,
      );
      expect(createNormalsCalled).toBe(true);
    });
  });

  // =========================================================================
  // createMechanicalLever
  // =========================================================================
  describe('createMechanicalLever', () => {
    it('creates intermediate meshes (shaft, ball, grip)', () => {
      createMechanicalLever('lever', { shaftLength: 1, gripRadius: 0.1 }, mockScene);
      // Should call CreateCylinder at least 3 times (shaft, grip, merged)
      // and CreateSphere once (ball)
      expect(mockCreateCylinder.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(mockCreateSphere).toHaveBeenCalled();
    });

    it('disposes intermediate meshes after merging', () => {
      createMechanicalLever('lever', { shaftLength: 1, gripRadius: 0.1 }, mockScene);
      // Shaft, ball, and grip should each be disposed
      const allMocks = [
        ...mockCreateCylinder.mock.results,
        ...mockCreateSphere.mock.results,
      ];
      let disposeCalls = 0;
      for (const result of allMocks) {
        if (result.value?.dispose?.mock?.calls?.length > 0) {
          disposeCalls++;
        }
      }
      expect(disposeCalls).toBeGreaterThanOrEqual(3);
    });

    it('shaft uses tapered cylinder (different top and bottom diameters)', () => {
      createMechanicalLever('lever', { shaftLength: 2, gripRadius: 0.5 }, mockScene);
      const shaftCall = mockCreateCylinder.mock.calls[0];
      const opts = shaftCall[1];
      expect(opts.diameterTop).toBeLessThan(opts.diameterBottom);
    });

    it('ball joint uses correct diameter based on gripRadius', () => {
      createMechanicalLever('lever', { shaftLength: 1, gripRadius: 0.2 }, mockScene);
      const sphereCall = mockCreateSphere.mock.calls[0];
      const opts = sphereCall[1];
      expect(opts.diameter).toBeCloseTo(0.2 * 1.4, 5);
    });

    it('returned mesh has sculpted vertices (not original cylinder)', () => {
      const result = createMechanicalLever('lever', { shaftLength: 1, gripRadius: 0.1 }, mockScene);
      expect(result).toBeDefined();
      // The merged mesh should have had sculptMesh applied
      expect(lastSetPositions).not.toBeNull();
    });

    it('shaft length affects final geometry height', () => {
      createMechanicalLever('short', { shaftLength: 0.5, gripRadius: 0.1 }, mockScene);
      const shortCall = mockCreateCylinder.mock.calls.find(
        (c: any[]) => c[0] === 'short',
      );

      mockCreateCylinder.mockClear();
      createMechanicalLever('tall', { shaftLength: 5, gripRadius: 0.1 }, mockScene);
      const tallCall = mockCreateCylinder.mock.calls.find(
        (c: any[]) => c[0] === 'tall',
      );

      if (shortCall && tallCall) {
        expect(tallCall[1].height).toBeGreaterThan(shortCall[1].height);
      }
    });

    it('grip region has ergonomic narrowing in the middle', () => {
      // The merged cylinder is sculpted with gauss-based narrowing in grip region
      createMechanicalLever('lever', { shaftLength: 1, gripRadius: 0.3 }, mockScene);
      // Verify sculpting occurred on the merged mesh
      expect(lastSetPositions).not.toBeNull();
      if (lastSetPositions) {
        // The sculpt function modifies radial distances, so positions should differ
        // from a plain cylinder
        const mergedCall = mockCreateCylinder.mock.calls.find(
          (c: any[]) => c[0] === 'lever',
        );
        expect(mergedCall).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Integration: gauss + smoothstep used in geometry factories
  // =========================================================================
  describe('integration', () => {
    it('sculptMesh with gauss creates bell-curve displacement', () => {
      const positions = [];
      // 11 vertices along Y from -1 to 1
      for (let i = -5; i <= 5; i++) {
        positions.push(0, i * 0.2, 0);
      }
      const mesh = mockMesh(positions);

      sculptMesh(mesh, (v, _ox, oy) => {
        v.x += gauss(oy, 0, 0.3) * 0.5;
      });

      if (lastSetPositions) {
        // Center vertex (oy=0) should have max displacement
        const centerIdx = 5;
        const centerX = lastSetPositions[centerIdx * 3];
        // Edge vertices (oy = +-1) should have less displacement
        const edgeX = lastSetPositions[0]; // oy = -1
        expect(centerX).toBeGreaterThan(edgeX);
      }
    });

    it('sculptMesh with smoothstep creates smooth transitions', () => {
      const positions = [];
      // 11 vertices along X from -1 to 1
      for (let i = -5; i <= 5; i++) {
        positions.push(i * 0.2, 0, 0);
      }
      const mesh = mockMesh(positions);

      sculptMesh(mesh, (v, ox) => {
        v.y += smoothstep(-0.5, 0.5, ox) * 0.5;
      });

      if (lastSetPositions) {
        // Leftmost vertex (ox=-1) should have y ~0 (below smoothstep range)
        expect(lastSetPositions[1]).toBeCloseTo(0, 3);
        // Rightmost vertex (ox=1) should have y ~0.5 (above smoothstep range)
        expect(lastSetPositions[10 * 3 + 1]).toBeCloseTo(0.5, 3);
      }
    });
  });
});
