'use client';

import type * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';

/**
 * WebXR session stub — sets up immersive VR when the browser supports it.
 *
 * On browsers without WebXR (most desktop browsers), this component
 * silently does nothing. On XR-capable browsers (Quest, Vision Pro, etc.),
 * it creates a default XR experience with hand tracking enabled.
 *
 * Future work:
 *   - Hand tracking → keycap interaction (pinch = press)
 *   - Haptic feedback on stabilization/shatter events
 *   - Spatial audio positioning via XR head tracking
 */
export default function XRSession() {
  const scene = useScene();
  const xrRef = useRef<BABYLON.WebXRDefaultExperience | null>(null);

  useEffect(() => {
    if (!scene) return;

    let disposed = false;

    const initXR = async () => {
      // Check if WebXR is available in this browser
      if (typeof navigator === 'undefined' || !navigator.xr) {
        return;
      }

      try {
        const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
        if (!isSupported || disposed) return;

        // Dynamic import to avoid pulling XR code on non-XR browsers
        const BABYLON = await import('@babylonjs/core');

        const xr = await BABYLON.WebXRDefaultExperience.CreateAsync(scene, {
          disableDefaultUI: false,
          disableTeleportation: true,
          optionalFeatures: true,
        });

        if (disposed) {
          xr.dispose();
          return;
        }

        xrRef.current = xr;

        // Enable hand tracking if available
        try {
          const handTracking = xr.baseExperience.featuresManager.enableFeature(
            BABYLON.WebXRFeatureName.HAND_TRACKING,
            'latest',
            { xrInput: xr.input },
          );
          if (handTracking) {
            console.info('[XR] Hand tracking enabled');
          }
        } catch (err) {
          console.warn('[XR] Hand tracking unavailable:', err);
        }
      } catch (err) {
        console.warn('[XR] WebXR setup failed:', err);
      }
    };

    initXR();

    return () => {
      disposed = true;
      if (xrRef.current) {
        xrRef.current.dispose();
        xrRef.current = null;
      }
    };
  }, [scene]);

  return null;
}
