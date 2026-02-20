import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';

/**
 * SphereTrackballSystem — Core interaction mechanic
 *
 * The sphere sits in the platter like a ball in a mouse. The player rotates it
 * freely via mouse drag (web), touch drag (native), hand gesture (XR), or
 * eye gaze (Vision Pro). All game state is communicated diegetically through
 * the sphere's nebula color, Fresnel rim, breathing pulse, and coherence ring —
 * there is no HUD.
 *
 * Arcball rotation: input delta → axis/angle → quaternion multiplication → sphere.rotationQuaternion
 *
 * Cross-platform input:
 * - Web: mouse drag on canvas (pointer lock optional)
 * - Native: touch drag gesture
 * - XR: hand pinch + drag near sphere
 * - Vision Pro: eye gaze direction → subtle drift rotation
 *
 * Inset constraint: sphere rotation is free (all axes), but the sphere center
 * stays fixed in the platter track. Only rotation changes, never position.
 *
 * Momentum: after release, rotation continues with damped angular velocity
 * (friction coefficient 0.95/frame) for organic feel.
 *
 * Source: Core game mechanic — diegetic trackball interaction
 */
export class SphereTrackballSystem {
  private static instance: SphereTrackballSystem | null = null;

  private scene: Scene | null = null;
  private sphereMesh: Mesh | null = null;
  private updateCallback: (() => void) | null = null;

  // Rotation state
  private currentRotation: Quaternion = Quaternion.Identity();
  private angularVelocity: Vector3 = Vector3.Zero(); // radians/frame on each axis

  // Input state
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private enabled = true;

  // Sensitivity tuning
  private readonly DRAG_SENSITIVITY = 0.005; // radians per pixel of drag
  private readonly MOMENTUM_FRICTION = 0.95; // velocity multiplier per frame
  private readonly MIN_VELOCITY = 0.0001; // below this, stop
  private readonly GAZE_DRIFT_SPEED = 0.002; // radians per frame for eye gaze

  // Sphere geometry (from MechanicalPlatter)
  private readonly SPHERE_RADIUS = 0.26; // 0.52m diameter / 2

  // Bound event handlers (for cleanup)
  private boundOnPointerDown: ((evt: PointerEvent) => void) | null = null;
  private boundOnPointerMove: ((evt: PointerEvent) => void) | null = null;
  private boundOnPointerUp: ((evt: PointerEvent) => void) | null = null;

  private constructor() {}

  static getInstance(): SphereTrackballSystem {
    if (!SphereTrackballSystem.instance) {
      SphereTrackballSystem.instance = new SphereTrackballSystem();
    }
    return SphereTrackballSystem.instance;
  }

  /**
   * Initialize with scene and sphere mesh reference.
   * Sets up pointer event listeners and per-frame update loop.
   */
  initialize(scene: Scene, sphereMesh: Mesh): void {
    this.scene = scene;
    this.sphereMesh = sphereMesh;

    // Ensure sphere uses quaternion rotation (not Euler)
    if (!sphereMesh.rotationQuaternion) {
      sphereMesh.rotationQuaternion = Quaternion.Identity();
    }
    this.currentRotation = sphereMesh.rotationQuaternion.clone();

    // Register pointer events on canvas
    const canvas = scene.getEngine().getRenderingCanvas();
    if (canvas) {
      this.boundOnPointerDown = this.onPointerDown.bind(this);
      this.boundOnPointerMove = this.onPointerMove.bind(this);
      this.boundOnPointerUp = this.onPointerUp.bind(this);

      canvas.addEventListener('pointerdown', this.boundOnPointerDown);
      canvas.addEventListener('pointermove', this.boundOnPointerMove);
      canvas.addEventListener('pointerup', this.boundOnPointerUp);
      canvas.addEventListener('pointerleave', this.boundOnPointerUp);
    }

    // Register per-frame update
    this.updateCallback = this.update.bind(this);
    scene.registerBeforeRender(this.updateCallback);

    console.log('[SphereTrackballSystem] Initialized');
  }

  /**
   * Arcball rotation: compute rotation quaternion from 2D input delta.
   *
   * Maps screen-space delta (dx, dy) to a rotation axis perpendicular to
   * the drag direction, with angle proportional to drag distance.
   * The axis is computed in camera space then transformed to world space.
   */
  computeArcballRotation(dx: number, dy: number): Quaternion {
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 0.001) return Quaternion.Identity();

    const angle = distance * this.DRAG_SENSITIVITY;

    // Rotation axis is perpendicular to drag direction in screen space:
    // drag right → rotate around Y (vertical axis)
    // drag up → rotate around X (horizontal axis)
    // The cross product of drag direction with camera forward gives the rotation axis
    const axis = new Vector3(-dy, dx, 0).normalize();

    // Transform axis from screen space to world space using camera orientation
    if (this.scene?.activeCamera) {
      const cameraWorldMatrix = this.scene.activeCamera.getWorldMatrix();
      const worldAxis = Vector3.TransformNormal(axis, cameraWorldMatrix);
      worldAxis.normalize();
      return Quaternion.RotationAxis(worldAxis, angle);
    }

    // Fallback: use axis directly (no camera transform)
    return Quaternion.RotationAxis(axis, angle);
  }

  /**
   * Apply an external rotation impulse (from XR hand gesture or touch system).
   * dx, dy are in normalized screen-space units (-1 to 1).
   */
  applyRotationDelta(dx: number, dy: number): void {
    if (!this.enabled) return;

    const scaledDx = dx * 200; // Scale to approximate pixel units
    const scaledDy = dy * 200;

    const rotation = this.computeArcballRotation(scaledDx, scaledDy);
    this.currentRotation = rotation.multiply(this.currentRotation);
    this.currentRotation.normalize();

    // Set angular velocity for momentum
    this.angularVelocity.x = -scaledDy * this.DRAG_SENSITIVITY;
    this.angularVelocity.y = scaledDx * this.DRAG_SENSITIVITY;
  }

  /**
   * Apply gaze-directed drift rotation (for eye tracking / Vision Pro).
   * gazeDirection is the normalized direction vector from camera to gaze point.
   */
  applyGazeDrift(gazeDirection: Vector3): void {
    if (!this.enabled || !this.sphereMesh) return;

    // Project gaze onto sphere surface to determine rotation direction
    const sphereCenter = this.sphereMesh.getAbsolutePosition();
    const cameraPos = this.scene?.activeCamera?.position ?? Vector3.Zero();
    const toSphere = sphereCenter.subtract(cameraPos).normalize();

    // Cross product of gaze and sphere-center direction gives rotation axis
    const rotationAxis = Vector3.Cross(toSphere, gazeDirection);
    const gazeAngle = rotationAxis.length();

    if (gazeAngle > 0.01) {
      rotationAxis.normalize();
      const drift = Quaternion.RotationAxis(rotationAxis, gazeAngle * this.GAZE_DRIFT_SPEED);
      this.currentRotation = drift.multiply(this.currentRotation);
      this.currentRotation.normalize();
    }
  }

  /**
   * Per-frame update: apply momentum, friction, and sync to mesh.
   */
  private update(): void {
    if (!this.sphereMesh || !this.enabled) return;

    // Apply momentum (angular velocity) when not actively dragging
    if (!this.isDragging) {
      const speed = this.angularVelocity.length();
      if (speed > this.MIN_VELOCITY) {
        // Convert angular velocity to rotation quaternion
        const momentumRotation = this.computeArcballRotation(
          this.angularVelocity.y / this.DRAG_SENSITIVITY,
          -this.angularVelocity.x / this.DRAG_SENSITIVITY,
        );
        this.currentRotation = momentumRotation.multiply(this.currentRotation);
        this.currentRotation.normalize();

        // Apply friction
        this.angularVelocity.scaleInPlace(this.MOMENTUM_FRICTION);
      } else {
        // Below threshold — stop
        this.angularVelocity.set(0, 0, 0);
      }
    }

    // Sync rotation to mesh
    if (this.sphereMesh.rotationQuaternion) {
      this.sphereMesh.rotationQuaternion.copyFrom(this.currentRotation);

      // Also sync Euler angles for handlers that read sphereMesh.rotation.y
      // (Babylon.js does NOT auto-sync .rotation from .rotationQuaternion)
      const euler = this.currentRotation.toEulerAngles();
      this.sphereMesh.rotation.set(euler.x, euler.y, euler.z);
    }
  }

  // ---------------------------------------------------------------------------
  // Pointer event handlers (web + native touch via pointer events)
  // ---------------------------------------------------------------------------

  private onPointerDown(evt: PointerEvent): void {
    if (!this.enabled || !this.sphereMesh || !this.scene) return;

    // Check if pointer hit the sphere via raycast
    const pickResult = this.scene.pick(evt.offsetX, evt.offsetY, (mesh) => mesh === this.sphereMesh);
    if (!pickResult?.hit) return;

    this.isDragging = true;
    this.lastPointerX = evt.offsetX;
    this.lastPointerY = evt.offsetY;

    // Kill momentum on new drag
    this.angularVelocity.set(0, 0, 0);
  }

  private onPointerMove(evt: PointerEvent): void {
    if (!this.isDragging || !this.enabled) return;

    const dx = evt.offsetX - this.lastPointerX;
    const dy = evt.offsetY - this.lastPointerY;

    // Apply arcball rotation
    const rotation = this.computeArcballRotation(dx, dy);
    this.currentRotation = rotation.multiply(this.currentRotation);
    this.currentRotation.normalize();

    // Track velocity for momentum
    this.angularVelocity.x = -dy * this.DRAG_SENSITIVITY;
    this.angularVelocity.y = dx * this.DRAG_SENSITIVITY;

    this.lastPointerX = evt.offsetX;
    this.lastPointerY = evt.offsetY;
  }

  private onPointerUp(_evt: PointerEvent): void {
    this.isDragging = false;
    // Momentum continues from last angularVelocity
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get the current rotation quaternion (for other systems to read).
   */
  getRotation(): Quaternion {
    return this.currentRotation.clone();
  }

  /**
   * Get the current angular velocity magnitude (for audio/haptic feedback).
   * Returns radians per frame.
   */
  getAngularSpeed(): number {
    return this.angularVelocity.length();
  }

  /**
   * Check if the sphere is currently being dragged.
   */
  getIsDragging(): boolean {
    return this.isDragging;
  }

  /**
   * Enable or disable trackball interaction.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.isDragging = false;
      this.angularVelocity.set(0, 0, 0);
    }
    console.log(`[SphereTrackballSystem] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Check if trackball is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Reset rotation to identity.
   */
  reset(): void {
    this.currentRotation = Quaternion.Identity();
    this.angularVelocity.set(0, 0, 0);
    this.isDragging = false;
    if (this.sphereMesh?.rotationQuaternion) {
      this.sphereMesh.rotationQuaternion.copyFrom(this.currentRotation);
    }
  }

  /**
   * Dispose system — remove event listeners and render loop.
   */
  dispose(): void {
    // Remove pointer events
    if (this.scene) {
      const canvas = this.scene.getEngine().getRenderingCanvas();
      if (canvas) {
        if (this.boundOnPointerDown) canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
        if (this.boundOnPointerMove) canvas.removeEventListener('pointermove', this.boundOnPointerMove);
        if (this.boundOnPointerUp) {
          canvas.removeEventListener('pointerup', this.boundOnPointerUp);
          canvas.removeEventListener('pointerleave', this.boundOnPointerUp);
        }
      }

      // Remove render loop
      if (this.updateCallback) {
        this.scene.unregisterBeforeRender(this.updateCallback);
      }
    }

    this.sphereMesh = null;
    this.scene = null;
    this.updateCallback = null;
    this.boundOnPointerDown = null;
    this.boundOnPointerMove = null;
    this.boundOnPointerUp = null;
    this.isDragging = false;
    this.angularVelocity.set(0, 0, 0);

    console.log('[SphereTrackballSystem] Disposed');
  }
}
