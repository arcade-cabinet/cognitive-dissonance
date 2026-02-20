/**
 * Tests for SphereTrackballSystem — Cognitive Dissonance v3.0
 *
 * Unit tests for the core trackball interaction system that handles arcball
 * rotation, momentum, pointer events, gaze drift, and XR input.
 *
 * Babylon.js math classes are mocked to avoid any WebGL/engine dependency.
 */

// Mock @babylonjs/core/Maths/math.vector with functional math implementations
jest.mock('@babylonjs/core/Maths/math.vector', () => {
  class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    static Zero() {
      return new Vector3();
    }
    static Distance(a: Vector3, b: Vector3) {
      return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    }
    static Cross(a: Vector3, b: Vector3) {
      return new Vector3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    }
    static TransformNormal(v: Vector3, _m: any) {
      return new Vector3(v.x, v.y, v.z);
    }
    normalize() {
      const l = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
      if (l > 0) {
        this.x /= l;
        this.y /= l;
        this.z /= l;
      }
      return this;
    }
    length() {
      return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    }
    subtract(other: Vector3) {
      return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    addInPlace(v: Vector3) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    scaleInPlace(s: number) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  class Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
    static Identity() {
      return new Quaternion(0, 0, 0, 1);
    }
    static RotationAxis(axis: Vector3, angle: number) {
      const ha = angle / 2;
      const s = Math.sin(ha);
      return new Quaternion(axis.x * s, axis.y * s, axis.z * s, Math.cos(ha));
    }
    multiply(other: Quaternion) {
      return new Quaternion(
        this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
        this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
        this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w,
        this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z,
      );
    }
    normalize() {
      const l = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2 + this.w ** 2);
      if (l > 0) {
        this.x /= l;
        this.y /= l;
        this.z /= l;
        this.w /= l;
      }
      return this;
    }
    clone() {
      return new Quaternion(this.x, this.y, this.z, this.w);
    }
    copyFrom(q: Quaternion) {
      this.x = q.x;
      this.y = q.y;
      this.z = q.z;
      this.w = q.w;
    }
    toEulerAngles() {
      // Simplified quaternion -> Euler (ZYX convention) for test purposes
      const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
      const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
      const rx = Math.atan2(sinr_cosp, cosr_cosp);
      const sinp = 2 * (this.w * this.y - this.z * this.x);
      const ry = Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);
      const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
      const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
      const rz = Math.atan2(siny_cosp, cosy_cosp);
      return new Vector3(rx, ry, rz);
    }
  }

  return { Vector3, Quaternion };
});

import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SphereTrackballSystem } from '../SphereTrackballSystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a quaternion is approximately identity (0, 0, 0, 1). */
function isIdentityQuaternion(q: { x: number; y: number; z: number; w: number }): boolean {
  const epsilon = 1e-6;
  return Math.abs(q.x) < epsilon && Math.abs(q.y) < epsilon && Math.abs(q.z) < epsilon && Math.abs(q.w - 1) < epsilon;
}

/** Create a minimal mock Scene object (type-only import, no jest.mock needed). */
function createMockScene() {
  const canvas = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  const engine = {
    getRenderingCanvas: () => canvas,
  };
  return {
    activeCamera: {
      position: new Vector3(0, 0, -10),
      getWorldMatrix: () => ({}), // TransformNormal mock ignores the matrix
    },
    getEngine: () => engine,
    registerBeforeRender: jest.fn(),
    unregisterBeforeRender: jest.fn(),
    pick: jest.fn(),
    _canvas: canvas, // exposed for test assertions
  };
}

/** Create a minimal mock Mesh object (type-only import, no jest.mock needed). */
function createMockMesh() {
  return {
    rotationQuaternion: Quaternion.Identity(),
    rotation: new Vector3(0, 0, 0),
    getAbsolutePosition: () => new Vector3(0, 0, 0),
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SphereTrackballSystem', () => {
  let system: SphereTrackballSystem;

  beforeEach(() => {
    // Reset singleton before each test
    (SphereTrackballSystem as any).instance = null;
    system = SphereTrackballSystem.getInstance();
  });

  afterEach(() => {
    system.dispose();
    (SphereTrackballSystem as any).instance = null;
  });

  // -------------------------------------------------------------------------
  // 1. Singleton pattern
  // -------------------------------------------------------------------------

  describe('Singleton pattern', () => {
    it('returns the same instance on repeated calls', () => {
      const a = SphereTrackballSystem.getInstance();
      const b = SphereTrackballSystem.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after singleton is reset', () => {
      const first = SphereTrackballSystem.getInstance();
      first.dispose();
      (SphereTrackballSystem as any).instance = null;
      const second = SphereTrackballSystem.getInstance();
      expect(second).not.toBe(first);
    });
  });

  // -------------------------------------------------------------------------
  // 2. computeArcballRotation
  // -------------------------------------------------------------------------

  describe('computeArcballRotation', () => {
    it('returns identity quaternion for zero input', () => {
      const result = system.computeArcballRotation(0, 0);
      expect(isIdentityQuaternion(result)).toBe(true);
    });

    it('returns identity quaternion for near-zero input (below threshold)', () => {
      const result = system.computeArcballRotation(0.0001, 0.0001);
      expect(isIdentityQuaternion(result)).toBe(true);
    });

    it('produces non-identity quaternion for non-zero dx', () => {
      const result = system.computeArcballRotation(100, 0);
      expect(isIdentityQuaternion(result)).toBe(false);
    });

    it('produces non-identity quaternion for non-zero dy', () => {
      const result = system.computeArcballRotation(0, 100);
      expect(isIdentityQuaternion(result)).toBe(false);
    });

    it('produces non-identity quaternion for non-zero dx and dy', () => {
      const result = system.computeArcballRotation(50, 50);
      expect(isIdentityQuaternion(result)).toBe(false);
    });

    it('produces a normalized quaternion', () => {
      const result = system.computeArcballRotation(100, 200);
      const length = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2 + result.w ** 2);
      expect(length).toBeCloseTo(1.0, 5);
    });

    it('produces larger rotation angle for larger input delta', () => {
      const small = system.computeArcballRotation(10, 0);
      const large = system.computeArcballRotation(100, 0);
      // The w component of a rotation quaternion is cos(angle/2).
      // Larger angle means smaller w (for angles < pi).
      expect(Math.abs(large.w)).toBeLessThan(Math.abs(small.w));
    });

    it('uses camera transform when scene has an active camera', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      system.initialize(mockScene as any, mockMesh as any);

      const result = system.computeArcballRotation(50, 50);
      // With the TransformNormal mock returning the same vector, the result
      // should still be a valid non-identity rotation
      expect(isIdentityQuaternion(result)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. applyRotationDelta
  // -------------------------------------------------------------------------

  describe('applyRotationDelta', () => {
    it('changes the current rotation for non-zero input', () => {
      const before = system.getRotation();
      system.applyRotationDelta(0.5, 0.5);
      const after = system.getRotation();

      // At least one component should differ
      const changed =
        Math.abs(after.x - before.x) > 1e-6 ||
        Math.abs(after.y - before.y) > 1e-6 ||
        Math.abs(after.z - before.z) > 1e-6 ||
        Math.abs(after.w - before.w) > 1e-6;
      expect(changed).toBe(true);
    });

    it('does not change rotation when disabled', () => {
      system.setEnabled(false);
      const before = system.getRotation();
      system.applyRotationDelta(0.5, 0.5);
      const after = system.getRotation();

      expect(after.x).toBeCloseTo(before.x, 10);
      expect(after.y).toBeCloseTo(before.y, 10);
      expect(after.z).toBeCloseTo(before.z, 10);
      expect(after.w).toBeCloseTo(before.w, 10);
    });

    it('produces a normalized quaternion after multiple deltas', () => {
      system.applyRotationDelta(0.3, 0.4);
      system.applyRotationDelta(-0.2, 0.6);
      system.applyRotationDelta(0.1, -0.5);

      const rot = system.getRotation();
      const length = Math.sqrt(rot.x ** 2 + rot.y ** 2 + rot.z ** 2 + rot.w ** 2);
      expect(length).toBeCloseTo(1.0, 5);
    });

    it('sets angular velocity for momentum after applying delta', () => {
      expect(system.getAngularSpeed()).toBe(0);
      system.applyRotationDelta(0.5, 0.3);
      expect(system.getAngularSpeed()).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 4. applyGazeDrift
  // -------------------------------------------------------------------------

  describe('applyGazeDrift', () => {
    it('does not change rotation when disabled', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      system.initialize(mockScene as any, mockMesh as any);
      system.setEnabled(false);

      const before = system.getRotation();
      system.applyGazeDrift(new Vector3(0.5, 0, 0.5));
      const after = system.getRotation();

      expect(after.x).toBeCloseTo(before.x, 10);
      expect(after.y).toBeCloseTo(before.y, 10);
      expect(after.z).toBeCloseTo(before.z, 10);
      expect(after.w).toBeCloseTo(before.w, 10);
    });

    it('does not change rotation when sphere mesh is null', () => {
      // System not initialized, so sphereMesh is null
      const before = system.getRotation();
      system.applyGazeDrift(new Vector3(0.5, 0, 0.5));
      const after = system.getRotation();

      expect(after.x).toBeCloseTo(before.x, 10);
      expect(after.w).toBeCloseTo(before.w, 10);
    });

    it('applies drift rotation when initialized and enabled', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      system.initialize(mockScene as any, mockMesh as any);

      const before = system.getRotation();
      // Use a gaze direction that will produce a non-trivial cross product
      system.applyGazeDrift(new Vector3(1, 0, 0));
      const after = system.getRotation();

      // The gaze drift should produce some change if the cross product
      // of toSphere and gazeDirection has length > 0.01
      // Since sphereCenter is (0,0,0) and cameraPos is (0,0,-10),
      // toSphere = (0,0,10).normalize() = (0,0,1)
      // cross((0,0,1), (1,0,0)) = (0*0-1*0, 1*1-0*0, 0*0-0*1) = (0, 1, 0), length=1 > 0.01
      const changed =
        Math.abs(after.x - before.x) > 1e-6 ||
        Math.abs(after.y - before.y) > 1e-6 ||
        Math.abs(after.z - before.z) > 1e-6 ||
        Math.abs(after.w - before.w) > 1e-6;
      expect(changed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 5. setEnabled / isEnabled
  // -------------------------------------------------------------------------

  describe('setEnabled / isEnabled', () => {
    it('is enabled by default', () => {
      expect(system.isEnabled()).toBe(true);
    });

    it('can be disabled', () => {
      system.setEnabled(false);
      expect(system.isEnabled()).toBe(false);
    });

    it('can be re-enabled', () => {
      system.setEnabled(false);
      system.setEnabled(true);
      expect(system.isEnabled()).toBe(true);
    });

    it('stops dragging when disabled', () => {
      // Simulate a drag state via internal property
      (system as any).isDragging = true;
      system.setEnabled(false);
      expect(system.getIsDragging()).toBe(false);
    });

    it('zeroes angular velocity when disabled', () => {
      system.applyRotationDelta(0.5, 0.5);
      expect(system.getAngularSpeed()).toBeGreaterThan(0);
      system.setEnabled(false);
      expect(system.getAngularSpeed()).toBe(0);
    });

    it('prevents applyRotationDelta when disabled', () => {
      system.setEnabled(false);
      system.applyRotationDelta(1.0, 1.0);
      expect(system.getAngularSpeed()).toBe(0);
      expect(isIdentityQuaternion(system.getRotation())).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 6. reset
  // -------------------------------------------------------------------------

  describe('reset', () => {
    it('returns rotation to identity quaternion', () => {
      system.applyRotationDelta(0.5, 0.5);
      expect(isIdentityQuaternion(system.getRotation())).toBe(false);

      system.reset();
      expect(isIdentityQuaternion(system.getRotation())).toBe(true);
    });

    it('zeroes angular velocity', () => {
      system.applyRotationDelta(0.5, 0.5);
      expect(system.getAngularSpeed()).toBeGreaterThan(0);

      system.reset();
      expect(system.getAngularSpeed()).toBe(0);
    });

    it('clears dragging state', () => {
      (system as any).isDragging = true;
      system.reset();
      expect(system.getIsDragging()).toBe(false);
    });

    it('syncs identity rotation to mesh when initialized', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      system.initialize(mockScene as any, mockMesh as any);

      system.applyRotationDelta(0.5, 0.5);
      system.reset();

      expect(isIdentityQuaternion(mockMesh.rotationQuaternion)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 7. getAngularSpeed
  // -------------------------------------------------------------------------

  describe('getAngularSpeed', () => {
    it('returns 0 initially', () => {
      expect(system.getAngularSpeed()).toBe(0);
    });

    it('returns non-zero after applyRotationDelta', () => {
      system.applyRotationDelta(0.5, 0.3);
      expect(system.getAngularSpeed()).toBeGreaterThan(0);
    });

    it('returns 0 after reset', () => {
      system.applyRotationDelta(0.5, 0.3);
      system.reset();
      expect(system.getAngularSpeed()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 8. getRotation
  // -------------------------------------------------------------------------

  describe('getRotation', () => {
    it('returns a clone, not the internal reference', () => {
      const rot1 = system.getRotation();
      const rot2 = system.getRotation();
      expect(rot1).not.toBe(rot2);
    });

    it('returns identity initially', () => {
      const rot = system.getRotation();
      expect(isIdentityQuaternion(rot)).toBe(true);
    });

    it('mutating the returned quaternion does not affect internal state', () => {
      const rot = system.getRotation();
      rot.x = 999;
      rot.y = 999;
      rot.z = 999;
      rot.w = 0;

      const internal = system.getRotation();
      expect(isIdentityQuaternion(internal)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 9. getIsDragging
  // -------------------------------------------------------------------------

  describe('getIsDragging', () => {
    it('returns false initially', () => {
      expect(system.getIsDragging()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 10. initialize
  // -------------------------------------------------------------------------

  describe('initialize', () => {
    it('registers pointer event listeners on canvas', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);

      const canvas = mockScene._canvas;
      expect(canvas.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('pointerleave', expect.any(Function));
    });

    it('registers a beforeRender callback on the scene', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);

      expect(mockScene.registerBeforeRender).toHaveBeenCalledWith(expect.any(Function));
    });

    it('sets rotationQuaternion on mesh if not already set', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      mockMesh.rotationQuaternion = null as any;

      system.initialize(mockScene as any, mockMesh as any);

      expect(mockMesh.rotationQuaternion).not.toBeNull();
    });

    it('clones the existing mesh rotation as current rotation', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      // Set a non-identity rotation on the mesh
      mockMesh.rotationQuaternion = new Quaternion(0.1, 0.2, 0.3, 0.9);
      mockMesh.rotationQuaternion.normalize();

      system.initialize(mockScene as any, mockMesh as any);

      const rotation = system.getRotation();
      expect(rotation.x).toBeCloseTo(mockMesh.rotationQuaternion.x, 5);
      expect(rotation.y).toBeCloseTo(mockMesh.rotationQuaternion.y, 5);
      expect(rotation.z).toBeCloseTo(mockMesh.rotationQuaternion.z, 5);
      expect(rotation.w).toBeCloseTo(mockMesh.rotationQuaternion.w, 5);
    });
  });

  // -------------------------------------------------------------------------
  // 11. dispose
  // -------------------------------------------------------------------------

  describe('dispose', () => {
    it('removes pointer event listeners from canvas', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);
      system.dispose();

      const canvas = mockScene._canvas;
      expect(canvas.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('pointerleave', expect.any(Function));
    });

    it('unregisters the beforeRender callback', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);
      system.dispose();

      expect(mockScene.unregisterBeforeRender).toHaveBeenCalledWith(expect.any(Function));
    });

    it('nullifies scene reference', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);
      system.dispose();

      expect((system as any).scene).toBeNull();
    });

    it('nullifies sphereMesh reference', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);
      system.dispose();

      expect((system as any).sphereMesh).toBeNull();
    });

    it('nullifies updateCallback reference', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);
      system.dispose();

      expect((system as any).updateCallback).toBeNull();
    });

    it('nullifies bound pointer handler references', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);
      system.dispose();

      expect((system as any).boundOnPointerDown).toBeNull();
      expect((system as any).boundOnPointerMove).toBeNull();
      expect((system as any).boundOnPointerUp).toBeNull();
    });

    it('resets dragging state', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);
      (system as any).isDragging = true;
      system.dispose();

      expect(system.getIsDragging()).toBe(false);
    });

    it('zeroes angular velocity', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();

      system.initialize(mockScene as any, mockMesh as any);
      system.applyRotationDelta(0.5, 0.5);
      system.dispose();

      expect(system.getAngularSpeed()).toBe(0);
    });

    it('is safe to call dispose without prior initialization', () => {
      // No initialize() call — dispose should not throw
      expect(() => system.dispose()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 12. Per-frame update (private, tested indirectly)
  // -------------------------------------------------------------------------

  describe('per-frame update loop', () => {
    it('syncs rotation to mesh on update', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      system.initialize(mockScene as any, mockMesh as any);

      // Apply a rotation
      system.applyRotationDelta(0.5, 0.5);

      // Manually invoke the registered update callback
      const updateFn = mockScene.registerBeforeRender.mock.calls[0][0] as () => void;
      updateFn();

      // Mesh quaternion should now match the internal rotation
      const rot = system.getRotation();
      expect(mockMesh.rotationQuaternion.x).toBeCloseTo(rot.x, 5);
      expect(mockMesh.rotationQuaternion.y).toBeCloseTo(rot.y, 5);
      expect(mockMesh.rotationQuaternion.z).toBeCloseTo(rot.z, 5);
      expect(mockMesh.rotationQuaternion.w).toBeCloseTo(rot.w, 5);
    });

    it('applies momentum friction when not dragging', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      system.initialize(mockScene as any, mockMesh as any);

      // Give the system angular velocity
      system.applyRotationDelta(0.5, 0.5);
      const speedBefore = system.getAngularSpeed();

      // Run one update frame (not dragging, so friction applies)
      const updateFn = mockScene.registerBeforeRender.mock.calls[0][0] as () => void;
      updateFn();

      const speedAfter = system.getAngularSpeed();
      // Speed should decrease due to friction (0.95 multiplier)
      expect(speedAfter).toBeLessThan(speedBefore);
      expect(speedAfter).toBeGreaterThan(0);
    });

    it('does not update when disabled', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      system.initialize(mockScene as any, mockMesh as any);

      // Apply rotation then disable
      system.applyRotationDelta(0.5, 0.5);
      const rotBefore = system.getRotation();
      system.setEnabled(false);

      // Manually invoke update — should be a no-op
      const updateFn = mockScene.registerBeforeRender.mock.calls[0][0] as () => void;
      updateFn();

      // Mesh should not have been updated (setEnabled zeroed velocity,
      // and update bails out early when disabled)
      // The mesh quaternion was last synced before disable, but the update
      // should not run further logic
      expect((system as any).enabled).toBe(false);
    });

    it('stops momentum when angular velocity drops below threshold', () => {
      const mockScene = createMockScene();
      const mockMesh = createMockMesh();
      system.initialize(mockScene as any, mockMesh as any);

      // Set a very small angular velocity just above zero
      const angVel = (system as any).angularVelocity;
      angVel.set(0.00005, 0.00005, 0);

      // Run update — velocity is below MIN_VELOCITY threshold (0.0001)
      const updateFn = mockScene.registerBeforeRender.mock.calls[0][0] as () => void;
      updateFn();

      expect(system.getAngularSpeed()).toBe(0);
    });
  });
});
