/**
 * HandPhysics — Hand Joint to PhysicsAggregate Force Application
 *
 * Maps XR hand joint positions to physics forces on keycaps, lever, and sphere.
 * Per ARCH v4.1 HandPhysicsSystem:
 * - Fingertips near keycaps → upward hold force (opposes spring compression)
 * - Palm on lever → angular motor force (lever resistance)
 * - Joints surrounding sphere → soft spring constraint (breathing pulse modulation)
 *
 * Design: Extracted from ARCH v4.1 Grok doc HandPhysicsSystem.
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { KeycapPhysics } from './KeycapPhysics';
import { PlatterPhysics } from './PlatterPhysics';

export class HandPhysics {
  private static instance: HandPhysics | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future scene access and disposed in dispose()
  private scene: Scene | null = null;

  private constructor() {}

  static getInstance(): HandPhysics {
    if (!HandPhysics.instance) {
      HandPhysics.instance = new HandPhysics();
    }
    return HandPhysics.instance;
  }

  /**
   * Initialize hand physics system.
   * @param scene - Babylon.js scene
   */
  initialize(scene: Scene): void {
    this.scene = scene;
    console.log('[HandPhysics] Initialized');
  }

  /**
   * Apply upward hold force to keycap when hand joint is near.
   * Opposes spring compression, simulates physical hold resistance.
   *
   * @param keycapMesh - Keycap mesh
   * @param jointPosition - Hand joint position (world space)
   * @param gripStrength - Grip strength (0.0–1.0)
   * @param proximityThreshold - Distance threshold for force application (default 0.05m = 5cm)
   */
  applyKeycapHoldForce(
    keycapMesh: Mesh,
    jointPosition: Vector3,
    gripStrength: number,
    proximityThreshold = 0.05,
  ): void {
    const keycapPosition = keycapMesh.getAbsolutePosition();
    const distance = Vector3.Distance(jointPosition, keycapPosition);

    if (distance > proximityThreshold) {
      return; // Joint too far from keycap
    }

    // Apply upward force proportional to grip strength
    // Force opposes spring compression (upward +Y direction)
    const keycapPhysics = KeycapPhysics.getInstance();
    const aggregate = keycapPhysics.getKeycapAggregate(keycapMesh.name);

    if (!aggregate || !aggregate.body) {
      return;
    }

    // Upward force: +Y direction, magnitude scaled by grip strength
    // Base force 15 (tuned to balance spring stiffness 800)
    const forceVector = new Vector3(0, gripStrength * 15, 0);
    aggregate.body.applyForce(forceVector, keycapPosition);
  }

  /**
   * Apply angular motor force to lever when palm grips it.
   * Simulates lever pull resistance.
   *
   * @param leverMesh - MODE_LEVER mesh
   * @param palmPosition - Palm joint position (world space)
   * @param gripStrength - Grip strength (0.0–1.0)
   * @param proximityThreshold - Distance threshold for force application (default 0.08m = 8cm)
   */
  applyLeverGripForce(leverMesh: Mesh, palmPosition: Vector3, gripStrength: number, proximityThreshold = 0.08): void {
    const leverPosition = leverMesh.getAbsolutePosition();
    const distance = Vector3.Distance(palmPosition, leverPosition);

    if (distance > proximityThreshold) {
      return; // Palm too far from lever
    }

    // Apply angular motor force via PlatterPhysics
    // Motor force scales with grip strength (opposes lever resistance)
    const platterPhysics = PlatterPhysics.getInstance();
    const leverAggregate = platterPhysics.getLeverAggregate();

    if (!leverAggregate || !leverAggregate.body) {
      return;
    }

    // Apply torque to lever body
    // Torque direction: X-axis (lever pivot axis), magnitude scaled by grip strength
    const torqueVector = new Vector3(gripStrength * 5, 0, 0);
    leverAggregate.body.applyTorque(torqueVector);
  }

  /**
   * Apply soft spring constraint to sphere when hand joints surround it.
   * Modulates breathing pulse amplitude based on grip proximity.
   *
   * @param sphereMesh - Glass sphere mesh
   * @param jointPositions - Array of hand joint positions (world space)
   * @param proximityThreshold - Distance threshold for constraint (default 0.15m = 15cm)
   * @returns Grip proximity factor (0.0–1.0) for breathing pulse modulation
   */
  applySphereGripConstraint(sphereMesh: Mesh, jointPositions: Vector3[], proximityThreshold = 0.15): number {
    const spherePosition = sphereMesh.getAbsolutePosition();
    let proximitySum = 0;
    let proximityCount = 0;

    // Calculate average proximity of all joints to sphere
    for (const jointPosition of jointPositions) {
      const distance = Vector3.Distance(jointPosition, spherePosition);
      if (distance < proximityThreshold) {
        // Proximity factor: 1.0 at contact, 0.0 at threshold
        const proximityFactor = 1.0 - distance / proximityThreshold;
        proximitySum += proximityFactor;
        proximityCount++;
      }
    }

    if (proximityCount === 0) {
      return 0.0; // No joints near sphere
    }

    // Average proximity factor (0.0–1.0)
    const averageProximity = proximitySum / proximityCount;

    // Soft spring constraint: apply gentle inward force toward sphere center
    // Force magnitude scales with proximity (stronger when closer)
    // This creates a "cradling" effect without rigid constraint
    for (const jointPosition of jointPositions) {
      const distance = Vector3.Distance(jointPosition, spherePosition);
      if (distance < proximityThreshold) {
        const directionToCenter = spherePosition.subtract(jointPosition).normalize();
        const forceMagnitude = averageProximity * 2; // Gentle force
        const _forceVector = directionToCenter.scale(forceMagnitude);

        // Note: Hand joints don't have physics bodies in current implementation
        // This force would be applied to a hand joint physics body if implemented
        // For now, return proximity factor for breathing pulse modulation
      }
    }

    return averageProximity;
  }

  /**
   * Dispose hand physics system.
   * Called during scene teardown.
   */
  dispose(): void {
    this.scene = null;
    console.log('[HandPhysics] Disposed');
  }
}
