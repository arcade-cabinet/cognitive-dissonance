/**
 * WebXRIntegration — Web AR via Babylon.js WebXR API
 *
 * Implements immersive-ar session mode with hit-test, anchors, hand-tracking, and depth-sensing.
 * Extracted from ARCH v3.2 XRManager.ts.
 *
 * Validates: Requirement 36.1
 */

import type { Scene } from '@babylonjs/core/scene';
import type { WebXRCamera } from '@babylonjs/core/XR/webXRCamera';
import type { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';
import type { WebXRSessionManager } from '@babylonjs/core/XR/webXRSessionManager';

export class WebXRIntegration {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future scene access and disposed in dispose()
  private scene: Scene | null = null;
  private xr: WebXRDefaultExperience | null = null;
  private xrCamera: WebXRCamera | null = null;
  private sessionManager: WebXRSessionManager | null = null;
  private isInXR = false;

  /**
   * Initialize WebXR with immersive-ar session mode.
   * Requests hit-test, hand-tracking, and depth-sensing features.
   */
  async initialize(scene: Scene): Promise<boolean> {
    this.scene = scene;

    try {
      // Create WebXR experience with immersive-ar session mode
      // Note: anchors feature is not available via WebXRFeatureName in Babylon.js 8
      // Will be handled via custom implementation in ARSessionManager
      this.xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
          sessionMode: 'immersive-ar',
        },
        optionalFeatures: ['hit-test', 'hand-tracking', 'depth-sensing'],
      });

      if (!this.xr) {
        console.warn('[WebXRIntegration] Failed to create WebXR experience');
        return false;
      }

      this.xrCamera = this.xr.baseExperience.camera;
      this.sessionManager = this.xr.baseExperience.sessionManager;

      // Register XR state change listeners
      this.xr.baseExperience.onStateChangedObservable.add((state) => {
        if (state === 2) {
          // IN_XR
          this.isInXR = true;
          console.log('[WebXRIntegration] Entered XR session');
        } else if (state === 0) {
          // NOT_IN_XR
          this.isInXR = false;
          console.log('[WebXRIntegration] Exited XR session');
        }
      });

      console.log('[WebXRIntegration] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[WebXRIntegration] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Enter XR session.
   */
  async enterXR(): Promise<boolean> {
    if (!this.xr) {
      console.warn('[WebXRIntegration] Cannot enter XR — not initialized');
      return false;
    }

    try {
      await this.xr.baseExperience.enterXRAsync('immersive-ar', 'local-floor');
      return true;
    } catch (error) {
      console.error('[WebXRIntegration] Failed to enter XR:', error);
      return false;
    }
  }

  /**
   * Exit XR session.
   */
  async exitXR(): Promise<void> {
    if (!this.xr) {
      return;
    }

    try {
      await this.xr.baseExperience.exitXRAsync();
    } catch (error) {
      console.error('[WebXRIntegration] Failed to exit XR:', error);
    }
  }

  /**
   * Check if currently in XR session.
   */
  getIsInXR(): boolean {
    return this.isInXR;
  }

  /**
   * Get XR camera (null if not in XR).
   */
  getXRCamera(): WebXRCamera | null {
    return this.xrCamera;
  }

  /**
   * Get session manager (null if not initialized).
   */
  getSessionManager(): WebXRSessionManager | null {
    return this.sessionManager;
  }

  /**
   * Get WebXR experience (null if not initialized).
   */
  getXRExperience(): WebXRDefaultExperience | null {
    return this.xr;
  }

  /**
   * Check if hand tracking is available.
   */
  isHandTrackingAvailable(): boolean {
    if (!this.xr) {
      return false;
    }

    // Check if hand-tracking feature is enabled
    const handTracking = this.xr.baseExperience.featuresManager.getEnabledFeature('xr-hand-tracking');
    return handTracking !== null;
  }

  /**
   * Check if depth sensing is available.
   */
  isDepthSensingAvailable(): boolean {
    if (!this.xr) {
      return false;
    }

    // Check if depth-sensing feature is enabled
    const depthSensing = this.xr.baseExperience.featuresManager.getEnabledFeature('xr-depth-sensing');
    return depthSensing !== null;
  }

  /**
   * Dispose WebXR integration.
   */
  dispose(): void {
    if (this.xr) {
      this.xr.baseExperience.dispose();
      this.xr = null;
    }

    this.scene = null;
    this.xrCamera = null;
    this.sessionManager = null;
    this.isInXR = false;
  }
}
