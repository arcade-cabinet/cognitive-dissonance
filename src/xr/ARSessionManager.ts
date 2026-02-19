/**
 * ARSessionManager — Dual AR/MR Mode Manager
 *
 * Manages AR session lifecycle with device type detection and dual mode support:
 * - Glasses room-scale: platter anchored to real surface, 26-joint hand tracking
 * - Phone camera projection: tap-to-place, touch controls
 *
 * MODE_LEVER on platter rim switches between modes.
 *
 * Extracted from ARCH v3.3 ARSessionManager.ts + integrated with WebXRIntegration,
 * ARKitIntegration, and ARCoreIntegration.
 *
 * Validates: Requirement 13, 36.5
 */

import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import { Platform } from 'react-native';
import { world } from '../ecs/World';
import { ARCoreIntegration } from '../native/ARCoreIntegration';
import { ARKitIntegration } from '../native/ARKitIntegration';
import type { GameEntity } from '../types';
import { HandInteractionSystem } from './HandInteractionSystem';
import { PhoneProjectionTouchSystem } from './PhoneProjectionTouchSystem';
import { WebXRIntegration } from './WebXRIntegration';
import { XRManager } from './XRManager';

type ARMode = 'glasses' | 'phone' | null;

export class ARSessionManager {
  private scene: Scene | null = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Stored for future engine access and disposed in dispose()
  private engine: Engine | null = null;
  private currentMode: ARMode = null;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: WebXRAnchor placeholder, stored for future anchor management
  private platterAnchor: unknown | null = null;
  private isInXR = false;
  private handTrackingAvailable = false;

  // Platform-specific AR integrations
  private webXR: WebXRIntegration | null = null;
  private arKit: ARKitIntegration | null = null;
  private arCore: ARCoreIntegration | null = null;

  // XR systems
  private xrManager: XRManager | null = null;
  private handInteractionSystem: HandInteractionSystem | null = null;
  private phoneProjectionTouchSystem: PhoneProjectionTouchSystem | null = null;

  /**
   * Initialize AR session manager.
   * Detects device type and creates appropriate AR mode.
   */
  async initialize(scene: Scene, engine: Engine): Promise<void> {
    this.scene = scene;
    this.engine = engine;

    // Detect device type
    const deviceType = this.detectDeviceType();
    console.log(`[ARSessionManager] Detected device type: ${deviceType}`);

    // Set initial mode based on device
    this.currentMode = deviceType === 'glasses' ? 'glasses' : 'phone';

    // Initialize platform-specific AR integration
    if (Platform.OS === 'web') {
      await this.initializeWebXR();
    } else if (Platform.OS === 'ios') {
      await this.initializeARKit();
    } else if (Platform.OS === 'android') {
      await this.initializeARCore();
    }

    // Initialize XR systems
    this.xrManager = XRManager.getInstance();
    this.handInteractionSystem = HandInteractionSystem.getInstance();
    this.phoneProjectionTouchSystem = PhoneProjectionTouchSystem.getInstance();
  }

  /**
   * Detect device type (glasses vs phone/tablet).
   * Uses Platform.OS and user agent heuristics.
   */
  private detectDeviceType(): 'glasses' | 'phone' {
    // Native: always phone mode (ARKit/ARCore)
    if (Platform.OS !== 'web') {
      return 'phone';
    }

    // Web: check user agent for AR glasses
    const ua = navigator.userAgent.toLowerCase();
    const isGlasses =
      ua.includes('quest') || ua.includes('oculus') || ua.includes('hololens') || ua.includes('magic leap');

    return isGlasses ? 'glasses' : 'phone';
  }

  /**
   * Initialize WebXR (web only).
   */
  private async initializeWebXR(): Promise<void> {
    if (!this.scene) {
      return;
    }

    this.webXR = new WebXRIntegration();
    const success = await this.webXR.initialize(this.scene);

    if (!success) {
      console.warn('[ARSessionManager] WebXR initialization failed — falling back to screen mode');
      this.webXR = null;
      return;
    }

    // Check hand tracking availability
    this.handTrackingAvailable = this.webXR.isHandTrackingAvailable();

    // Initialize XRManager with WebXR experience
    const xrExperience = this.webXR.getXRExperience();
    if (this.xrManager && this.scene && xrExperience) {
      await this.xrManager.init(this.scene, xrExperience);
    }

    console.log(`[ARSessionManager] WebXR initialized (hand tracking: ${this.handTrackingAvailable})`);
  }

  /**
   * Initialize ARKit (iOS only).
   */
  private async initializeARKit(): Promise<void> {
    this.arKit = new ARKitIntegration();
    const success = await this.arKit.startARSession();

    if (!success) {
      console.warn('[ARSessionManager] ARKit initialization failed — falling back to screen mode');
      this.arKit = null;
      return;
    }

    console.log('[ARSessionManager] ARKit initialized');
  }

  /**
   * Initialize ARCore (Android only).
   */
  private async initializeARCore(): Promise<void> {
    this.arCore = new ARCoreIntegration();
    const success = await this.arCore.startARSession();

    if (!success) {
      console.warn('[ARSessionManager] ARCore initialization failed — falling back to screen mode');
      this.arCore = null;
      return;
    }

    console.log('[ARSessionManager] ARCore initialized');
  }

  /**
   * Enter XR session (web only).
   */
  async enterXR(): Promise<boolean> {
    if (!this.webXR) {
      console.warn('[ARSessionManager] Cannot enter XR — WebXR not initialized');
      return false;
    }

    const success = await this.webXR.enterXR();
    if (success) {
      this.isInXR = true;
      this.onEnterXR();
    }

    return success;
  }

  /**
   * Exit XR session (web only).
   */
  async exitXR(): Promise<void> {
    if (!this.webXR) {
      return;
    }

    await this.webXR.exitXR();
    this.isInXR = false;
    this.onExitXR();
  }

  /**
   * Called when entering XR session.
   */
  private onEnterXR(): void {
    console.log('[ARSessionManager] Entered XR session');

    // Place platter based on current mode
    if (this.currentMode === 'glasses') {
      this.placeGlassesMode();
      this.activateHandInteraction();
    } else if (this.currentMode === 'phone') {
      this.placePhoneMode();
      this.activatePhoneProjectionTouch();
    }
  }

  /**
   * Called when exiting XR session.
   */
  private onExitXR(): void {
    console.log('[ARSessionManager] Exited XR session');

    // Deactivate input systems
    this.handInteractionSystem?.deactivate();
    this.phoneProjectionTouchSystem?.deactivate();

    // Clean up AR entities
    const arEntities = world.with('arAnchored');
    for (const entity of arEntities) {
      world.remove(entity);
    }

    this.platterAnchor = null;
  }

  /**
   * Place platter in glasses room-scale mode.
   * Auto-place at gaze + floor via ray pick.
   */
  private placeGlassesMode(): void {
    if (!this.scene) {
      return;
    }

    console.log('[ARSessionManager] Placing platter (glasses mode)');

    // TODO: Implement auto-placement via ray pick to floor
    // For now, create WorldAnchoredPlatter entity at origin
    const entity: Partial<GameEntity> = {
      arAnchored: true,
      platterCore: true,
      anchor: null, // WebXRAnchor placeholder
      modeLeverPosition: 1, // +1 = glasses mode
      roomScale: true,
      position: { x: 0, y: 0, z: -2 }, // 2m in front of user
    };

    world.add(entity as GameEntity);
  }

  /**
   * Place platter in phone camera projection mode.
   * Register onPointerDown for tap-to-place (one-time).
   */
  private placePhoneMode(): void {
    if (!this.scene) {
      return;
    }

    console.log('[ARSessionManager] Placing platter (phone mode)');

    // TODO: Implement tap-to-place via hit-test
    // For now, create ProjectedPlatter entity at origin
    const entity: Partial<GameEntity> = {
      arAnchored: true,
      platterCore: true,
      anchor: null, // WebXRAnchor placeholder
      modeLeverPosition: -1, // -1 = phone mode
      phoneProjected: true,
      position: { x: 0, y: 0, z: -2 }, // 2m in front of user
    };

    world.add(entity as GameEntity);
  }

  /**
   * Activate hand interaction system (glasses mode).
   */
  private activateHandInteraction(): void {
    if (!this.scene || !this.handInteractionSystem) {
      return;
    }

    this.handInteractionSystem.activate();
    console.log('[ARSessionManager] Hand interaction activated');
  }

  /**
   * Activate phone projection touch system (phone mode).
   */
  private activatePhoneProjectionTouch(): void {
    if (!this.scene || !this.phoneProjectionTouchSystem || !this.webXR) {
      return;
    }

    this.phoneProjectionTouchSystem.activate(this.scene, this.webXR.getXRExperience() ?? undefined);
    console.log('[ARSessionManager] Phone projection touch activated');
  }

  /**
   * Switch between glasses and phone modes.
   * Called by MODE_LEVER pull.
   */
  switchMode(newMode: 'glasses' | 'phone'): void {
    if (this.currentMode === newMode) {
      return;
    }

    console.log(`[ARSessionManager] Switching mode: ${this.currentMode} → ${newMode}`);

    this.currentMode = newMode;

    // Deactivate current input system
    this.handInteractionSystem?.deactivate();
    this.phoneProjectionTouchSystem?.deactivate();

    // Re-place platter if in XR
    if (this.isInXR) {
      // Remove existing AR entities
      const arEntities = world.with('arAnchored');
      for (const entity of arEntities) {
        world.remove(entity);
      }

      // Place in new mode
      if (newMode === 'glasses') {
        this.placeGlassesMode();
        this.activateHandInteraction();
      } else {
        this.placePhoneMode();
        this.activatePhoneProjectionTouch();
      }
    }
  }

  /**
   * Get current AR mode.
   */
  getCurrentMode(): ARMode {
    return this.currentMode;
  }

  /**
   * Check if currently in XR session.
   */
  getIsInXR(): boolean {
    return this.isInXR;
  }

  /**
   * Check if hand tracking is available.
   */
  isHandTrackingAvailable(): boolean {
    return this.handTrackingAvailable;
  }

  /**
   * Dispose AR session manager.
   */
  dispose(): void {
    // Dispose platform-specific AR integrations
    this.webXR?.dispose();
    this.arKit?.stopARSession();
    this.arCore?.stopARSession();

    // Dispose XR systems
    this.xrManager?.dispose();
    this.handInteractionSystem?.dispose();
    this.phoneProjectionTouchSystem?.dispose();

    // Clean up AR entities
    const arEntities = world.with('arAnchored');
    for (const entity of arEntities) {
      world.remove(entity);
    }

    this.scene = null;
    this.engine = null;
    this.currentMode = null;
    this.platterAnchor = null;
    this.isInXR = false;
    this.handTrackingAvailable = false;
    this.webXR = null;
    this.arKit = null;
    this.arCore = null;
    this.xrManager = null;
    this.handInteractionSystem = null;
    this.phoneProjectionTouchSystem = null;
  }
}
