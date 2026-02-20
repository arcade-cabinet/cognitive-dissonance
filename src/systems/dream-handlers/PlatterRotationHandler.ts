/**
 * PlatterRotationDream handler
 *
 * Mechanics:
 * - Platter physically rotates at seed-derived RPM (2-8 RPM base, scales to 18 RPM with tension)
 * - Keycaps orbit with platter
 * - Player must hold keycaps as they pass the 90 degree reach zone (+/-45 degrees from camera forward)
 * - Holding outside reach zone has no effect
 * - Rotation speed increases logarithmically with tension
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import gsap from 'gsap';
import type { GameEntity } from '../../types';
import { type DreamHandler, registerHandler } from './index';

export class PlatterRotationHandler implements DreamHandler {
  private entity: GameEntity | null = null;
  private scene: Scene | null = null;
  private platterMesh: Mesh | null = null;
  private baseRPM = 0;
  private currentRPM = 0;
  private reachZoneArc = Math.PI / 2; // 90 degree arc (+/-45 degrees)

  activate(entity: GameEntity, scene: Scene): void {
    this.entity = entity;
    this.scene = scene;
    this.baseRPM = entity.rotationRPM ?? 5; // Default 5 RPM if not set
    this.currentRPM = this.baseRPM;

    // Find platter mesh in scene
    this.platterMesh = scene.getMeshByName('platter') as Mesh;
    if (!this.platterMesh) {
      console.warn('[PlatterRotationHandler] Platter mesh not found in scene');
    }
  }

  update(dt: number): void {
    if (!this.platterMesh || !this.entity) return;

    // Get current tension from scene metadata
    const tension = this.scene?.metadata?.currentTension ?? 0;

    // Logarithmic RPM scaling: rpm * (1 + log1p(tension * 3))
    this.currentRPM = this.baseRPM * (1 + Math.log1p(tension * 3));

    // Rotate platter: RPM -> radians per second -> radians per frame
    const radiansPerSecond = (this.currentRPM * 2 * Math.PI) / 60;
    const radiansPerFrame = radiansPerSecond * dt;
    this.platterMesh.rotation.y += radiansPerFrame;
  }

  /**
   * Check if a keycap world position is within the 90 degree reach zone
   * (+/-45 degrees from camera forward projected onto platter plane)
   */
  isInReachZone(keycapWorldPosition: Vector3): boolean {
    if (!this.scene) return false;

    const camera = this.scene.activeCamera;
    if (!camera) return false;

    // Camera forward projected onto XZ plane (platter plane)
    const cameraForward = camera.getForwardRay().direction;
    const cameraForwardXZ = new Vector3(cameraForward.x, 0, cameraForward.z).normalize();

    // Keycap direction from platter center projected onto XZ plane
    const platterCenter = this.platterMesh?.position ?? Vector3.Zero();
    const keycapDirection = keycapWorldPosition.subtract(platterCenter);
    const keycapDirectionXZ = new Vector3(keycapDirection.x, 0, keycapDirection.z).normalize();

    // Angle between camera forward and keycap direction
    const angle = Math.acos(Vector3.Dot(cameraForwardXZ, keycapDirectionXZ));

    // Within +/-45 degrees (pi/4 radians)?
    return angle <= this.reachZoneArc / 2;
  }

  dispose(): void {
    // Stop platter rotation
    if (this.platterMesh) {
      gsap.killTweensOf(this.platterMesh.rotation);
    }
    this.entity = null;
    this.scene = null;
    this.platterMesh = null;
  }
}

// Self-register
registerHandler('PlatterRotation', PlatterRotationHandler);
