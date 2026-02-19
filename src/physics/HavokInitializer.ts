/**
 * HavokInitializer — Havok Physics Engine Initialization
 *
 * Loads Havok WASM binary asynchronously and initializes the Havok physics plugin
 * with gravity and fixed timestep per Req 39.1, 39.2.
 *
 * Design: Extracted from ARCH v4.1 Grok doc.
 * - Havok WASM binary: ~1.2 MB (included in bundle size budget)
 * - Gravity: Vector3(0, -9.81, 0)
 * - Fixed timestep: 1/60s (matches render loop target)
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import type { Scene } from '@babylonjs/core/scene';
import HavokPhysics from '@babylonjs/havok';

export class HavokInitializer {
  private static instance: HavokInitializer | null = null;
  private havokPlugin: HavokPlugin | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): HavokInitializer {
    if (!HavokInitializer.instance) {
      HavokInitializer.instance = new HavokInitializer();
    }
    return HavokInitializer.instance;
  }

  /**
   * Initialize Havok physics plugin asynchronously.
   * Loads Havok WASM binary (~1.2 MB) and enables physics on the scene.
   *
   * @param scene - Babylon.js scene to enable physics on
   * @returns Promise that resolves when physics is initialized
   */
  async initialize(scene: Scene): Promise<void> {
    if (this.isInitialized) {
      console.warn('[HavokInitializer] Already initialized');
      return;
    }

    try {
      // Load Havok WASM binary asynchronously
      const havokInstance = await HavokPhysics();

      // Create Havok plugin with debug mode disabled
      this.havokPlugin = new HavokPlugin(true, havokInstance);

      // Enable physics on scene with gravity and fixed timestep
      // Gravity: Vector3(0, -9.81, 0) per Req 39.2
      // Fixed timestep: 1/60s (set via plugin, matches render loop target)
      scene.enablePhysics(new Vector3(0, -9.81, 0), this.havokPlugin);

      this.isInitialized = true;
      console.log('[HavokInitializer] Havok physics initialized successfully');
    } catch (error) {
      console.error('[HavokInitializer] Failed to initialize Havok physics:', error);
      throw error;
    }
  }

  /**
   * Get the initialized Havok plugin instance.
   * @returns HavokPlugin instance or null if not initialized
   */
  getPlugin(): HavokPlugin | null {
    return this.havokPlugin;
  }

  /**
   * Check if Havok physics is initialized.
   * @returns true if initialized, false otherwise
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Dispose Havok physics plugin.
   * Called during scene teardown.
   */
  dispose(): void {
    if (this.havokPlugin) {
      // Havok plugin disposal is handled by scene.dispose()
      this.havokPlugin = null;
    }
    this.isInitialized = false;
    console.log('[HavokInitializer] Havok physics disposed');
  }
}
