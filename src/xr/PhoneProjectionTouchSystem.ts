import type { PointerInfo } from '@babylonjs/core/Events/pointerEvents';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import type { Scene } from '@babylonjs/core/scene';
import type { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';

/**
 * PhoneProjectionTouchSystem
 *
 * Handles screen touch input for phone camera projection AR mode.
 * Routes pointer events to gameplay systems via raycast picking.
 *
 * Design: ARCH v3.3 PhoneProjectionTouchSystem
 * Requirement: Req 15 (Phone Projection Touch System)
 */
export class PhoneProjectionTouchSystem {
  private static instance: PhoneProjectionTouchSystem | null = null;

  private scene: Scene | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future XR-specific touch handling
  private xr: WebXRDefaultExperience | null = null;
  private isActive = false;

  // Callbacks for gameplay system integration
  private onKeycapTouch: ((keyName: string) => void) | null = null;
  private onLeverTouch: ((pickDistance: number) => void) | null = null;
  private onRimTouch: ((pickX: number) => void) | null = null;

  private constructor() {}

  static getInstance(): PhoneProjectionTouchSystem {
    if (!PhoneProjectionTouchSystem.instance) {
      PhoneProjectionTouchSystem.instance = new PhoneProjectionTouchSystem();
    }
    return PhoneProjectionTouchSystem.instance;
  }

  /**
   * Activate phone projection touch input
   * @param scene Babylon.js scene
   * @param xr WebXR experience (optional, for XR-specific touch handling)
   */
  activate(scene: Scene, xr?: WebXRDefaultExperience): void {
    if (this.isActive) return;

    this.scene = scene;
    this.xr = xr || null;
    this.isActive = true;

    // Register pointer observers for touch events
    scene.onPointerObservable.add(this.handlePointerEvent);
  }

  /**
   * Deactivate phone projection touch input
   */
  deactivate(): void {
    if (!this.isActive || !this.scene) return;

    this.scene.onPointerObservable.removeCallback(this.handlePointerEvent);
    this.scene = null;
    this.xr = null;
    this.isActive = false;
  }

  /**
   * Register callback for keycap touch events
   * @param callback Function to call when a keycap is touched (receives keycap name)
   */
  setKeycapTouchCallback(callback: (keyName: string) => void): void {
    this.onKeycapTouch = callback;
  }

  /**
   * Register callback for lever touch events
   * @param callback Function to call when the lever is touched (receives pick distance)
   */
  setLeverTouchCallback(callback: (pickDistance: number) => void): void {
    this.onLeverTouch = callback;
  }

  /**
   * Register callback for rim touch events
   * @param callback Function to call when the platter rim is touched (receives pick x-coordinate)
   */
  setRimTouchCallback(callback: (pickX: number) => void): void {
    this.onRimTouch = callback;
  }

  /**
   * Handle pointer events (touch down, touch move)
   * Routes to appropriate gameplay system based on picked mesh
   */
  private handlePointerEvent = (pointerInfo: PointerInfo): void => {
    if (!this.scene || !this.isActive) return;

    const { type, pickInfo } = pointerInfo;

    // Only handle pointer down and pointer move
    if (type !== PointerEventTypes.POINTERDOWN && type !== PointerEventTypes.POINTERMOVE) {
      return;
    }

    // Raycast pick to find touched mesh
    if (!pickInfo || !pickInfo.hit || !pickInfo.pickedMesh) return;

    const mesh = pickInfo.pickedMesh;
    const meshName = mesh.name.toLowerCase();

    // Route to appropriate callback based on mesh name
    if (meshName.includes('keycap')) {
      // Extract keycap letter from mesh name (e.g., "keycap-A" → "A")
      const keyMatch = mesh.name.match(/keycap-([A-Z])/i);
      if (keyMatch && this.onKeycapTouch) {
        this.onKeycapTouch(keyMatch[1].toUpperCase());
      }
    } else if (meshName.includes('lever')) {
      // Lever touch: pass pick distance (distance from camera to pick point)
      if (pickInfo.pickedPoint && this.onLeverTouch) {
        const distance = pickInfo.distance || 0;
        this.onLeverTouch(distance);
      }
    } else if (meshName.includes('rim') || meshName.includes('platter')) {
      // Rim touch: pass pick x-coordinate for rotation control
      if (pickInfo.pickedPoint && this.onRimTouch) {
        this.onRimTouch(pickInfo.pickedPoint.x);
      }
    }
  };

  /**
   * Reset system state for new Dream
   */
  reset(): void {
    // No persistent state to reset — callbacks remain registered
  }

  /**
   * Dispose system resources
   */
  dispose(): void {
    this.deactivate();
    this.onKeycapTouch = null;
    this.onLeverTouch = null;
    this.onRimTouch = null;
  }
}
