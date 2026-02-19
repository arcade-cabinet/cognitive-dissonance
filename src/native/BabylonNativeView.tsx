/**
 * BabylonNativeView — Custom React Native component for Babylon Native rendering
 *
 * This component bridges React Native to Babylon Native's bgfx backend:
 * - iOS: MTKView → Babylon Native Engine (Metal)
 * - Android: SurfaceView → Babylon Native Engine (Vulkan/GLES)
 *
 * The native module creates the rendering surface and initializes Babylon Native's
 * bgfx backend. The JS side receives an engine reference via the onEngineReady event
 * and passes it to the shared SceneManager — from that point, 95%+ of game code is
 * identical to web.
 *
 * @see design.md "Babylon Native Integration Architecture"
 * @see requirements.md Requirement 35
 */

import { requireNativeComponent, type ViewProps } from 'react-native';

/**
 * Props for BabylonNativeView
 */
export interface BabylonNativeViewProps extends ViewProps {
  /**
   * Callback fired when the native Babylon Native engine is ready
   * @param event - Event containing the engineId (opaque reference to native engine)
   */
  onEngineReady?: (event: { nativeEvent: { engineId: string } }) => void;

  /**
   * Enable antialiasing (MSAA) on the rendering surface
   * @default true
   */
  antialias?: boolean;

  /**
   * Enable stencil buffer (required for AR occlusion fallback)
   * @default true
   */
  stencil?: boolean;
}

/**
 * BabylonNativeView — Native rendering surface for Babylon Native
 *
 * Usage:
 * ```tsx
 * <BabylonNativeView
 *   style={{ flex: 1 }}
 *   onEngineReady={(event) => {
 *     const engineId = event.nativeEvent.engineId;
 *     // Pass engineId to SceneManager
 *   }}
 *   antialias={true}
 *   stencil={true}
 * />
 * ```
 *
 * Note: This component requires native module implementation in:
 * - ios/CognitiveDissonance/BabylonNativeViewManager.swift
 * - android/app/src/main/java/arcade/cabinet/cognitivedissonance/BabylonNativeViewManager.kt
 *
 * If native modules are not implemented, this component will throw an error at runtime.
 * The fallback strategy (per Req 35.5) is to use screen-mode rendering (platter in dark void)
 * without native AR support.
 */
export const BabylonNativeView = requireNativeComponent<BabylonNativeViewProps>('BabylonNativeView');
