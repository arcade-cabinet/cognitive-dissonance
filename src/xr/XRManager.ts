import type { Scene } from '@babylonjs/core/scene';
import type { WebXRHandTracking } from '@babylonjs/core/XR/features/WebXRHandTracking';
import type { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';
import { WebXRFeatureName } from '@babylonjs/core/XR/webXRFeaturesManager';
import { world } from '../ecs/World';
import type { GameEntity, HandJoint } from '../types';

/**
 * XRManager — WebXR session lifecycle and hand tracking
 *
 * Creates Hand_Archetype entities from WebXRHandTracking:
 * - LeftHand and RightHand with 26 joints each
 * - Per-frame joint update loop: grip/pinch calculation, mechanical mapping
 *
 * Source: ARCH v3.2 XRManager.ts
 * Validates: Requirement 14.1
 */
export class XRManager {
  private static instance: XRManager | null = null;

  private scene: Scene | null = null;
  private handTracking: WebXRHandTracking | null = null;
  private leftHandEntity: GameEntity | null = null;
  private rightHandEntity: GameEntity | null = null;
  private updateLoopRegistered = false;

  private constructor() {}

  static getInstance(): XRManager {
    if (!XRManager.instance) {
      XRManager.instance = new XRManager();
    }
    return XRManager.instance;
  }

  /**
   * Initialize XR manager with scene and XR experience
   */
  async init(scene: Scene, xr: WebXRDefaultExperience): Promise<void> {
    this.scene = scene;

    // Get hand tracking feature
    this.handTracking = xr.baseExperience.featuresManager.getEnabledFeature(
      WebXRFeatureName.HAND_TRACKING,
    ) as WebXRHandTracking | null;

    if (!this.handTracking) {
      console.warn('XRManager: Hand tracking not available');
      return;
    }

    // Create Hand_Archetype entities
    this.createHandEntities();

    // Register per-frame update loop
    this.registerUpdateLoop();

    console.log('XRManager: Initialized with hand tracking');
  }

  /**
   * Create LeftHand and RightHand Miniplex entities
   */
  private createHandEntities(): void {
    if (!this.handTracking) return;

    // Left hand
    const leftJoints: HandJoint[] = [];
    const leftHand = this.handTracking.getHandByHandedness('left');
    if (leftHand?.handMesh) {
      // WebXRHand has 25 joints (XRHandJoint enum)
      // We'll create a joint entry for each
      for (const joint of leftHand.handMesh.getChildren()) {
        leftJoints.push({
          // biome-ignore lint/suspicious/noExplicitAny: WebXRJoint type not fully exported
          joint: joint as any,
          // biome-ignore lint/suspicious/noExplicitAny: Mesh type placeholder
          mesh: null as any, // Glass-shard particle overlay will be added by HandInteractionSystem
        });
      }
    }

    this.leftHandEntity = world.add({
      xrHand: true,
      left: true,
      joints: leftJoints,
      gripStrength: 0.0,
      pinchStrength: 0.0,
      contactPoints: [],
    });

    // Right hand
    const rightJoints: HandJoint[] = [];
    const rightHand = this.handTracking.getHandByHandedness('right');
    if (rightHand?.handMesh) {
      for (const joint of rightHand.handMesh.getChildren()) {
        rightJoints.push({
          // biome-ignore lint/suspicious/noExplicitAny: WebXRJoint type not fully exported
          joint: joint as any,
          // biome-ignore lint/suspicious/noExplicitAny: Mesh type placeholder
          mesh: null as any,
        });
      }
    }

    this.rightHandEntity = world.add({
      xrHand: true,
      right: true,
      joints: rightJoints,
      gripStrength: 0.0,
      pinchStrength: 0.0,
      contactPoints: [],
    });

    console.log(
      `XRManager: Created hand entities (left: ${leftJoints.length} joints, right: ${rightJoints.length} joints)`,
    );
  }

  /**
   * Register per-frame update loop for joint updates
   */
  private registerUpdateLoop(): void {
    if (!this.scene || this.updateLoopRegistered) return;

    this.scene.registerBeforeRender(() => {
      this.updateHandJoints();
    });

    this.updateLoopRegistered = true;
  }

  /**
   * Per-frame joint update: grip/pinch calculation
   */
  private updateHandJoints(): void {
    if (!this.handTracking) return;

    // Update left hand
    if (this.leftHandEntity) {
      const leftHand = this.handTracking.getHandByHandedness('left');
      if (leftHand) {
        this.leftHandEntity.gripStrength = this.calculateGripStrength(leftHand);
        this.leftHandEntity.pinchStrength = this.calculatePinchStrength(leftHand);
      }
    }

    // Update right hand
    if (this.rightHandEntity) {
      const rightHand = this.handTracking.getHandByHandedness('right');
      if (rightHand) {
        this.rightHandEntity.gripStrength = this.calculateGripStrength(rightHand);
        this.rightHandEntity.pinchStrength = this.calculatePinchStrength(rightHand);
      }
    }
  }

  /**
   * Calculate grip strength from finger curl angles
   * Returns normalized 0.0 (open hand) to 1.0 (full fist)
   */
  // biome-ignore lint/suspicious/noExplicitAny: WebXRHand type not fully exported
  private calculateGripStrength(hand: any): number {
    // Simplified grip calculation: average curl of index, middle, ring, pinky fingers
    // In a full implementation, this would measure joint angles
    // For now, return a placeholder based on hand mesh scale (proxy for curl)
    const scale = hand.handMesh.scaling.length();
    return Math.max(0, Math.min(1, (1.0 - scale) * 2));
  }

  /**
   * Calculate pinch strength from thumb-index distance
   * Returns normalized 0.0 (apart) to 1.0 (touching)
   */
  // biome-ignore lint/suspicious/noExplicitAny: WebXRHand type not fully exported
  private calculatePinchStrength(hand: any): number {
    // Simplified pinch calculation: inverse distance between thumb tip and index tip
    // In a full implementation, this would measure actual joint positions
    // For now, return a placeholder
    const thumbTip = hand.handMesh
      .getChildMeshes()
      .find((m: { name: string | string[] }) => m.name.includes('thumb-tip'));
    const indexTip = hand.handMesh
      .getChildMeshes()
      .find((m: { name: string | string[] }) => m.name.includes('index-finger-tip'));

    if (thumbTip && indexTip) {
      const distance = thumbTip.position.subtract(indexTip.position).length();
      return Math.max(0, Math.min(1, 1.0 - distance * 10)); // Normalize to 0-1
    }

    return 0.0;
  }

  /**
   * Get left hand entity
   */
  getLeftHand(): GameEntity | null {
    return this.leftHandEntity;
  }

  /**
   * Get right hand entity
   */
  getRightHand(): GameEntity | null {
    return this.rightHandEntity;
  }

  /**
   * Dispose XR manager
   */
  dispose(): void {
    if (this.leftHandEntity) {
      world.remove(this.leftHandEntity);
      this.leftHandEntity = null;
    }

    if (this.rightHandEntity) {
      world.remove(this.rightHandEntity);
      this.rightHandEntity = null;
    }

    this.scene = null;
    this.handTracking = null;
    this.updateLoopRegistered = false;
  }
}
