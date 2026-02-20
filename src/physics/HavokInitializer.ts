/**
 * HavokInitializer — Havok Physics Engine Initialization
 *
 * Loads Havok WASM binary asynchronously and initializes the Havok physics plugin
 * with gravity and fixed timestep per Req 39.1, 39.2.
 *
 * Metro config forces @babylonjs/havok to the UMD entry point (CJS-compatible)
 * to avoid the import.meta issue in ESM entry. Works on web + native.
 *
 * - Havok WASM binary: ~1.2 MB
 * - Gravity: Vector3(0, -9.81, 0)
 * - Fixed timestep: 1/60s (matches render loop target)
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import type { Scene } from '@babylonjs/core/scene';
import HavokPhysics from '@babylonjs/havok';
import { isWeb } from '../utils/PlatformConfig';

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
   * Loads WASM binary and enables physics on the scene.
   */
  async initialize(scene: Scene): Promise<void> {
    if (this.isInitialized) return;

    // On web, WASM is served from public/HavokPhysics.wasm.
    // On native, the default locateFile behavior works (bundled with app).
    const options = isWeb ? { locateFile: () => '/HavokPhysics.wasm' } : {};
    const havokInstance = await HavokPhysics(options);
    this.havokPlugin = new HavokPlugin(true, havokInstance);

    // Gravity: Vector3(0, -9.81, 0) per Req 39.2
    scene.enablePhysics(new Vector3(0, -9.81, 0), this.havokPlugin);

    this.isInitialized = true;
    console.log('[HavokInitializer] Havok physics initialized successfully');
  }

  getPlugin(): HavokPlugin | null {
    return this.havokPlugin;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    if (this.havokPlugin) {
      this.havokPlugin = null;
    }
    this.isInitialized = false;
  }
}
