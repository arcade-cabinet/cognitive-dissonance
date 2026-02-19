import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { LeftHand, RightHand } from '../ecs/World';
import type { MechanicalAnimationSystem } from '../systems/MechanicalAnimationSystem';
import type { PatternStabilizationSystem } from '../systems/PatternStabilizationSystem';
import type { TensionSystem } from '../systems/TensionSystem';
import { MechanicalHaptics } from './MechanicalHaptics';

/**
 * HandInteractionSystem — Maps 26-joint hand tracking to gameplay
 *
 * Proximity-based mapping:
 * - Fingertips near keycap → PatternStabilization.holdKey(pinchStrength)
 * - Palm on lever → MechanicalAnimation.pullLever(gripStrength)
 * - Joints surrounding sphere → TensionSystem.increase(0.02)
 * - Any contact → MechanicalHaptics.triggerContact
 *
 * Source: ARCH v3.2 HandInteractionSystem
 * Validates: Requirement 14.2
 */
export class HandInteractionSystem {
  private static instance: HandInteractionSystem | null = null;

  private scene: Scene | null = null;
  private patternSystem: PatternStabilizationSystem | null = null;
  private animationSystem: MechanicalAnimationSystem | null = null;
  private tensionSystem: TensionSystem | null = null;
  private haptics: MechanicalHaptics | null = null;

  private keycaps: Map<string, Mesh> = new Map();
  private leverMesh: Mesh | null = null;
  private sphereMesh: Mesh | null = null;

  private updateLoopRegistered = false;

  // Proximity thresholds (meters)
  private readonly KEYCAP_PROXIMITY = 0.05; // 5cm
  private readonly LEVER_PROXIMITY = 0.08; // 8cm
  private readonly SPHERE_PROXIMITY = 0.15; // 15cm

  private constructor() {}

  static getInstance(): HandInteractionSystem {
    if (!HandInteractionSystem.instance) {
      HandInteractionSystem.instance = new HandInteractionSystem();
    }
    return HandInteractionSystem.instance;
  }

  /**
   * Initialize the system with scene and system references
   */
  init(
    scene: Scene,
    patternSystem: PatternStabilizationSystem,
    animationSystem: MechanicalAnimationSystem,
    tensionSystem: TensionSystem,
    keycaps: Map<string, Mesh>,
    leverMesh: Mesh,
    sphereMesh: Mesh,
  ): void {
    this.scene = scene;
    this.patternSystem = patternSystem;
    this.animationSystem = animationSystem;
    this.tensionSystem = tensionSystem;
    this.keycaps = keycaps;
    this.leverMesh = leverMesh;
    this.sphereMesh = sphereMesh;
    this.haptics = MechanicalHaptics.getInstance();

    console.log('HandInteractionSystem: Initialized');
  }

  /**
   * Activate hand interaction (called when XR session enters IN_XR state)
   */
  activate(): void {
    if (!this.scene || this.updateLoopRegistered) return;

    this.scene.registerBeforeRender(() => {
      this.updateHandInteractions();
    });

    this.updateLoopRegistered = true;
    console.log('HandInteractionSystem: Activated');
  }

  /**
   * Deactivate hand interaction (called when XR session exits or mode switches)
   */
  deactivate(): void {
    // Scene.unregisterBeforeRender requires the exact function reference
    // For now, we'll just set a flag and skip updates
    this.updateLoopRegistered = false;
    console.log('HandInteractionSystem: Deactivated');
  }

  /**
   * Per-frame update: check hand joint proximity to gameplay objects
   */
  private updateHandInteractions(): void {
    if (!this.updateLoopRegistered) return;

    // Query left and right hand entities
    const leftHands = LeftHand.entities;
    const rightHands = RightHand.entities;

    for (const hand of [...leftHands, ...rightHands]) {
      if (!hand.joints) continue;

      // Check fingertip proximity to keycaps
      this.checkKeycapInteraction(hand);

      // Check palm proximity to lever
      this.checkLeverInteraction(hand);

      // Check joint proximity to sphere
      this.checkSphereInteraction(hand);
    }
  }

  /**
   * Check if fingertips are near any keycap
   */
  private checkKeycapInteraction(hand: { joints?: { joint: { position: Vector3 } }[]; pinchStrength?: number }): void {
    if (!hand.joints || !this.patternSystem) return;

    // Get fingertip joints (thumb, index, middle)
    const fingertips = hand.joints.slice(0, 3); // Simplified: first 3 joints

    for (const [keyName, keycapMesh] of this.keycaps.entries()) {
      for (const fingertip of fingertips) {
        const distance = Vector3.Distance(fingertip.joint.position, keycapMesh.position);

        if (distance < this.KEYCAP_PROXIMITY) {
          // Trigger pattern stabilization
          const pinchStrength = hand.pinchStrength ?? 0.5;
          this.patternSystem.holdKey(keyName, 100, pinchStrength); // 100ms hold duration per frame

          // Trigger haptic feedback
          this.haptics?.triggerContact(pinchStrength, 'keycapHold');

          break; // One fingertip per keycap
        }
      }
    }
  }

  /**
   * Check if palm is gripping the lever
   */
  private checkLeverInteraction(hand: { joints?: { joint: { position: Vector3 } }[]; gripStrength?: number }): void {
    if (!hand.joints || !this.animationSystem || !this.leverMesh) return;

    // Get palm joint (simplified: joint at index 13, middle of hand)
    const palmJoint = hand.joints[13];
    if (!palmJoint) return;

    const distance = Vector3.Distance(palmJoint.joint.position, this.leverMesh.position);

    if (distance < this.LEVER_PROXIMITY) {
      // Trigger lever pull
      const gripStrength = hand.gripStrength ?? 0.5;
      this.animationSystem.pullLever(gripStrength);

      // Trigger haptic feedback
      this.haptics?.triggerContact(gripStrength, 'leverPull');
    }
  }

  /**
   * Check if joints are surrounding the sphere (cradle gesture)
   */
  private checkSphereInteraction(hand: { joints?: { joint: { position: Vector3 } }[] }): void {
    if (!hand.joints || !this.tensionSystem || !this.sphereMesh) return;

    // Count how many joints are within sphere proximity
    let jointsNearSphere = 0;

    for (const joint of hand.joints) {
      const distance = Vector3.Distance(joint.joint.position, this.sphereMesh.position);
      if (distance < this.SPHERE_PROXIMITY) {
        jointsNearSphere++;
      }
    }

    // If 5+ joints are near sphere, consider it a cradle gesture
    if (jointsNearSphere >= 5) {
      // Increase tension (sphere contact is destabilizing)
      this.tensionSystem.increase(0.02);

      // Trigger light haptic feedback
      this.haptics?.triggerContact(0.3, 'sphereTouch');
    }
  }

  /**
   * Dispose the system
   */
  dispose(): void {
    this.deactivate();
    this.scene = null;
    this.patternSystem = null;
    this.animationSystem = null;
    this.tensionSystem = null;
    this.haptics = null;
    this.keycaps.clear();
    this.leverMesh = null;
    this.sphereMesh = null;
  }
}
