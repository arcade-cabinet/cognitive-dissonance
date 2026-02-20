import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { ArriveBehavior, EntityManager, SeekBehavior, Vehicle, WanderBehavior, Vector3 as YukaVector3 } from 'yuka';
import type { YukaTrait } from '../types';

/**
 * YukaSteeringSystem — Bridges Yuka AI agents to Babylon.js meshes
 *
 * Each spawned enemy gets a Yuka Vehicle with trait-specific steering behaviors.
 * Per-frame: EntityManager.update() computes new positions, then syncs to meshes.
 *
 * Trait -> Behavior mapping:
 * - NeonRaymarcher: Wander (erratic patrol near spawn)
 * - TendrilBinder: Seek sphere (heads toward center orb)
 * - PlatterCrusher: Arrive platter (approaches platter surface)
 * - GlassShatterer: Seek sphere + fast speed
 * - EchoRepeater: Wander + follow path (orbits platter rim)
 * - LeverSnatcher: Seek lever
 * - SphereCorruptor: Seek sphere + slow speed
 *
 * Validates: Requirement 11 (Yuka AI Behaviors)
 */
export class YukaSteeringSystem {
  private static instance: YukaSteeringSystem | null = null;

  private entityManager: EntityManager;
  private vehicleMap: Map<Mesh, Vehicle> = new Map();
  private spherePosition = new YukaVector3(0, 0, 0);
  private leverPosition = new YukaVector3(0.4, 0, 0);
  private platterPosition = new YukaVector3(0, -0.09, 0);

  private constructor() {
    this.entityManager = new EntityManager();
  }

  static getInstance(): YukaSteeringSystem {
    if (!YukaSteeringSystem.instance) {
      YukaSteeringSystem.instance = new YukaSteeringSystem();
    }
    return YukaSteeringSystem.instance;
  }

  /**
   * Initialize with scene and target mesh positions.
   */
  initialize(_scene: Scene, sphereMesh: Mesh, leverMesh: Mesh): void {
    this.spherePosition.set(sphereMesh.position.x, sphereMesh.position.y, sphereMesh.position.z);
    this.leverPosition.set(leverMesh.position.x, leverMesh.position.y, leverMesh.position.z);
  }

  /**
   * Register a spawned enemy mesh with a Yuka Vehicle.
   * Creates the Vehicle, adds trait-specific steering behaviors, and starts AI.
   */
  registerEnemy(mesh: Mesh, trait: YukaTrait): Vehicle {
    const vehicle = new Vehicle();
    vehicle.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    vehicle.maxSpeed = this.getMaxSpeed(trait);
    vehicle.maxForce = 1.0;
    vehicle.boundingRadius = 0.15;

    // Add trait-specific steering behavior
    this.addTraitBehavior(vehicle, trait);

    // Register with EntityManager
    this.entityManager.add(vehicle);
    this.vehicleMap.set(mesh, vehicle);

    return vehicle;
  }

  /**
   * Unregister an enemy (when disposed by ProceduralMorphSystem).
   */
  unregisterEnemy(mesh: Mesh): void {
    const vehicle = this.vehicleMap.get(mesh);
    if (vehicle) {
      this.entityManager.remove(vehicle);
      this.vehicleMap.delete(mesh);
    }
  }

  /**
   * Per-frame update: Yuka EntityManager computes new positions,
   * then syncs back to Babylon.js meshes.
   */
  update(dt: number): void {
    // Yuka EntityManager expects delta in seconds
    this.entityManager.update(dt);

    // Sync Yuka positions back to Babylon.js meshes
    for (const [mesh, vehicle] of this.vehicleMap) {
      if (mesh.isDisposed()) {
        this.vehicleMap.delete(mesh);
        this.entityManager.remove(vehicle);
        continue;
      }
      mesh.position.x = vehicle.position.x;
      mesh.position.y = vehicle.position.y;
      mesh.position.z = vehicle.position.z;
    }
  }

  /**
   * Add trait-specific steering behavior to a Vehicle.
   */
  private addTraitBehavior(vehicle: Vehicle, trait: YukaTrait): void {
    switch (trait) {
      case 'NeonRaymarcher': {
        // Erratic patrol — wander near spawn point
        const wander = new WanderBehavior();
        wander.jitter = 5;
        wander.radius = 0.3;
        wander.distance = 0.5;
        vehicle.steering.add(wander);
        break;
      }
      case 'TendrilBinder': {
        // Heads toward center orb
        const seek = new SeekBehavior(this.spherePosition);
        vehicle.steering.add(seek);
        break;
      }
      case 'PlatterCrusher': {
        // Approaches platter surface
        const arrive = new ArriveBehavior(this.platterPosition, 0.5);
        vehicle.steering.add(arrive);
        break;
      }
      case 'GlassShatterer': {
        // Fast approach to sphere
        const seek = new SeekBehavior(this.spherePosition);
        vehicle.steering.add(seek);
        break;
      }
      case 'EchoRepeater': {
        // Wander around platter rim
        const wander = new WanderBehavior();
        wander.jitter = 3;
        wander.radius = 0.5;
        wander.distance = 0.6;
        vehicle.steering.add(wander);
        break;
      }
      case 'LeverSnatcher': {
        // Seek lever position
        const seek = new SeekBehavior(this.leverPosition);
        vehicle.steering.add(seek);
        break;
      }
      case 'SphereCorruptor': {
        // Slow approach to sphere
        const arrive = new ArriveBehavior(this.spherePosition, 0.3);
        vehicle.steering.add(arrive);
        break;
      }
    }
  }

  /**
   * Get max speed for a trait.
   */
  private getMaxSpeed(trait: YukaTrait): number {
    switch (trait) {
      case 'NeonRaymarcher':
        return 0.3;
      case 'TendrilBinder':
        return 0.2;
      case 'PlatterCrusher':
        return 0.15;
      case 'GlassShatterer':
        return 0.5; // Fast
      case 'EchoRepeater':
        return 0.25;
      case 'LeverSnatcher':
        return 0.35;
      case 'SphereCorruptor':
        return 0.1; // Slow
      default:
        return 0.2;
    }
  }

  /**
   * Get active enemy count.
   */
  getActiveEnemyCount(): number {
    return this.vehicleMap.size;
  }

  /**
   * Reset for new Dream.
   */
  reset(): void {
    for (const [, vehicle] of this.vehicleMap) {
      this.entityManager.remove(vehicle);
    }
    this.vehicleMap.clear();
  }

  /**
   * Dispose system.
   */
  dispose(): void {
    this.reset();
    YukaSteeringSystem.instance = null;
  }
}
