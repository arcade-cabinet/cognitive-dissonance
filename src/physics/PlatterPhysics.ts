/**
 * PlatterPhysics — Platter and MODE_LEVER Physics Constraints
 *
 * Implements:
 * - Platter PhysicsAggregate with tension-driven resistance (simulated via force application)
 * - MODE_LEVER PhysicsAggregate with dynamic resistance creep
 *
 * Note: Babylon.js 8 Physics v2 API doesn't expose hinge constraints or motor types.
 * This implementation uses PhysicsAggregate with force/torque application for resistance simulation.
 *
 * Design: Extracted from ARCH v4.1 Grok doc.
 * - Platter: Static body (mass 0), rotation resistance simulated via angular damping
 * - MODE_LEVER: Light body (mass 0.1), resistance simulated via torque application
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import type { Scene } from '@babylonjs/core/scene';

export class PlatterPhysics {
  private static instance: PlatterPhysics | null = null;
  private platterAggregate: PhysicsAggregate | null = null;
  private leverAggregate: PhysicsAggregate | null = null;
  private currentTension = 0.0;
  private leverResistanceMultiplier = 1.0;

  private constructor() {}

  static getInstance(): PlatterPhysics {
    if (!PlatterPhysics.instance) {
      PlatterPhysics.instance = new PlatterPhysics();
    }
    return PlatterPhysics.instance;
  }

  /**
   * Apply physics aggregate to platter mesh.
   * Creates static body with tension-driven resistance.
   *
   * @param platterMesh - Platter cylinder mesh
   * @param scene - Babylon.js scene
   */
  applyPlatterPhysics(platterMesh: Mesh, scene: Scene): void {
    // Create physics aggregate for platter (static body, mass 0)
    this.platterAggregate = new PhysicsAggregate(
      platterMesh,
      PhysicsShapeType.CYLINDER,
      { mass: 0 }, // Static body (infinite mass)
      scene,
    );

    console.log('[PlatterPhysics] Applied physics to platter');
  }

  /**
   * Apply physics aggregate to MODE_LEVER mesh.
   * Creates light body with dynamic resistance creep.
   *
   * @param leverMesh - MODE_LEVER box mesh
   * @param platterMesh - Platter mesh (parent)
   * @param scene - Babylon.js scene
   */
  applyLeverPhysics(leverMesh: Mesh, _platterMesh: Mesh, scene: Scene): void {
    // Create physics aggregate for lever
    this.leverAggregate = new PhysicsAggregate(
      leverMesh,
      PhysicsShapeType.BOX,
      { mass: 0.1, restitution: 0.2 }, // Light mass for responsive feel
      scene,
    );

    console.log('[PlatterPhysics] Applied physics to MODE_LEVER');
  }

  /**
   * Update platter resistance based on current tension.
   * Resistance simulated via angular damping (higher tension = more resistance).
   *
   * Note: Babylon.js 8 Physics v2 doesn't expose angular motor force setters.
   * Resistance is simulated by applying counter-torque when platter rotates.
   *
   * @param tension - Current tension value (0.0–0.999)
   */
  setTension(tension: number): void {
    this.currentTension = tension;
    // Resistance will be applied via applyPlatterResistance method during rotation
  }

  /**
   * Apply counter-torque to platter based on current tension.
   * Called during platter rotation to simulate tension-driven resistance.
   *
   * @param angularVelocity - Current angular velocity of platter
   */
  applyPlatterResistance(angularVelocity: number): void {
    if (!this.platterAggregate || !this.platterAggregate.body) {
      return;
    }

    // Counter-torque proportional to tension and angular velocity
    // Motor force = tension × 120 (per ARCH v4.1)
    const resistanceTorque = -angularVelocity * this.currentTension * 120;
    this.platterAggregate.body.applyAngularImpulse(new Vector3(0, resistanceTorque, 0));
  }

  /**
   * Update lever resistance based on resistance multiplier.
   * Resistance multiplier comes from MechanicalDegradationSystem (1.0–2.5 with tension).
   *
   * @param multiplier - Resistance multiplier (1.0–2.5)
   */
  setLeverResistance(multiplier: number): void {
    this.leverResistanceMultiplier = multiplier;
    // Resistance will be applied via applyLeverResistance method during lever pull
  }

  /**
   * Apply counter-torque to lever based on resistance multiplier.
   * Called during lever pull to simulate dynamic resistance creep.
   *
   * @param angularVelocity - Current angular velocity of lever
   */
  applyLeverResistance(angularVelocity: number): void {
    if (!this.leverAggregate || !this.leverAggregate.body) {
      return;
    }

    // Counter-torque proportional to resistance multiplier and angular velocity
    // Base motor force 50, scaled by resistance multiplier
    const resistanceTorque = -angularVelocity * 50 * this.leverResistanceMultiplier;
    this.leverAggregate.body.applyAngularImpulse(new Vector3(resistanceTorque, 0, 0));
  }

  /**
   * Get platter physics aggregate.
   * @returns PhysicsAggregate or null if not initialized
   */
  getPlatterAggregate(): PhysicsAggregate | null {
    return this.platterAggregate;
  }

  /**
   * Get lever physics aggregate.
   * @returns PhysicsAggregate or null if not initialized
   */
  getLeverAggregate(): PhysicsAggregate | null {
    return this.leverAggregate;
  }

  /**
   * Dispose platter and lever physics.
   * Called during scene teardown.
   */
  dispose(): void {
    if (this.platterAggregate) {
      this.platterAggregate.dispose();
      this.platterAggregate = null;
    }

    if (this.leverAggregate) {
      this.leverAggregate.dispose();
      this.leverAggregate = null;
    }

    console.log('[PlatterPhysics] Disposed platter and lever physics');
  }
}
