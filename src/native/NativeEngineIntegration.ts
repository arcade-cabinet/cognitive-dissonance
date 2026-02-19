/**
 * NativeEngineIntegration — Bridge between BabylonNativeView and SceneManager
 *
 * This module provides the integration layer between the native Babylon Native engine
 * (exposed via BabylonNativeView's onEngineReady event) and the shared SceneManager
 * component used across web and native platforms.
 *
 * On native platforms, the engine is created by the native module (MTKView on iOS,
 * SurfaceView on Android) and passed to JavaScript as an opaque engineId reference.
 * This module resolves that reference to an actual Engine instance that can be used
 * with the rest of the game code.
 *
 * @see design.md "Babylon Native Integration Architecture"
 * @see requirements.md Requirement 35
 */

import type { Engine } from '@babylonjs/core/Engines/engine';

/**
 * Global registry of native engine instances
 * Keyed by engineId (UUID string from native module)
 *
 * This is populated by the native module when the engine is created.
 * In the stub implementation, this registry is empty and getEngineFromId
 * will throw an error.
 */
const nativeEngineRegistry = new Map<string, Engine>();

/**
 * Register a native engine instance
 * Called by native module after engine creation
 *
 * @param engineId - Opaque engine reference from native module
 * @param engine - Babylon.js Engine instance
 */
export function registerNativeEngine(engineId: string, engine: Engine): void {
  nativeEngineRegistry.set(engineId, engine);
}

/**
 * Get a native engine instance by ID
 * Called by SceneManager to resolve the engine reference
 *
 * @param engineId - Opaque engine reference from onEngineReady event
 * @returns Babylon.js Engine instance
 * @throws Error if engineId is not found (stub implementation)
 */
export function getEngineFromId(engineId: string): Engine {
  const engine = nativeEngineRegistry.get(engineId);
  if (!engine) {
    throw new Error(
      `Native engine not found for ID: ${engineId}\n\n` +
        'This error occurs because the Babylon Native integration is not fully implemented.\n' +
        'The native modules (BabylonNativeViewManager.swift and BabylonNativeViewManager.kt) ' +
        'are currently stubs that do not create a real Babylon Native engine.\n\n' +
        'Fallback strategy (per Req 35.5):\n' +
        '- Use screen-mode rendering (platter in dark void)\n' +
        '- Disable native AR features\n' +
        '- Use keyboard/touch input instead of XR hand tracking\n\n' +
        'See design.md "Babylon Native Integration Architecture" for full implementation details.',
    );
  }
  return engine;
}

/**
 * Unregister a native engine instance
 * Called when the native view is unmounted
 *
 * @param engineId - Opaque engine reference from native module
 */
export function unregisterNativeEngine(engineId: string): void {
  nativeEngineRegistry.delete(engineId);
}

/**
 * Check if native engine integration is available
 * Returns false in stub implementation
 *
 * @returns true if native engines can be created, false otherwise
 */
export function isNativeEngineAvailable(): boolean {
  // In stub implementation, always return false
  // Full implementation would check for Babylon Native library availability
  return false;
}
