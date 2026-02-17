/**
 * Post-Processing Effects Stack
 *
 * Adds cinematic visual quality to the 3D scene:
 * - Bloom: Glow from emissive materials (keyboard LEDs, enemy bubbles, boss energy)
 * - Chromatic Aberration: Subtle color fringing that increases with panic
 * - Vignette: Darkened edges for focus
 *
 * Uses @react-three/postprocessing for efficient R3F integration.
 */

import { useFrame } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import type React from 'react';
import { useRef } from 'react';
import * as THREE from 'three';

interface PostProcessingProps {
  panicRef: React.RefObject<number>;
}

export function PostProcessing({ panicRef }: PostProcessingProps) {
  const chromaticRef = useRef<{ offset: THREE.Vector2 } | null>(null);
  const vignetteRef = useRef<{ darkness: number } | null>(null);

  useFrame(() => {
    const panic = panicRef.current ?? 0;
    const pNorm = panic / 100;

    // Chromatic aberration increases with panic (subtle at low, pronounced at high)
    if (chromaticRef.current) {
      const offset = pNorm * pNorm * 0.003;
      chromaticRef.current.offset.set(offset, offset);
    }

    // Vignette darkens at high panic
    if (vignetteRef.current) {
      vignetteRef.current.darkness = 0.3 + pNorm * 0.4;
    }
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.8} luminanceThreshold={0.6} luminanceSmoothing={0.3} mipmapBlur />
      <ChromaticAberration
        ref={chromaticRef}
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0, 0)}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette ref={vignetteRef} eskil={false} offset={0.1} darkness={0.3} />
    </EffectComposer>
  );
}
