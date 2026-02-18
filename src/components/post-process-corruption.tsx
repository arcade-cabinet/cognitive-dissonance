'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { useLevelStore } from '@/store/level-store';

interface PostProcessCorruptionProps {
  tension: number;
}

export default function PostProcessCorruption({ tension }: PostProcessCorruptionProps) {
  const scene = useScene();
  const effectRef = useRef<BABYLON.PostProcess | null>(null);

  useEffect(() => {
    if (!scene || !scene.activeCamera) return;

    // Custom post-process for chromatic aberration + noise + vignette
    BABYLON.Effect.ShadersStore['corruptionFragmentShader'] = `
      precision highp float;
      varying vec2 vUV;
      uniform sampler2D textureSampler;
      uniform float u_tension;
      uniform float u_time;

      void main() {
        vec2 uv = vUV;
        float t = u_tension;

        // Chromatic aberration
        float offset = t * 0.008;
        float r = texture2D(textureSampler, uv + vec2(offset, 0.0)).r;
        float g = texture2D(textureSampler, uv).g;
        float b = texture2D(textureSampler, uv - vec2(offset, 0.0)).b;
        vec3 color = vec3(r, g, b);

        // Film noise
        float noise = fract(sin(dot(uv + u_time, vec2(12.9898, 78.233))) * 43758.5453);
        color += (noise - 0.5) * t * 0.15;

        // Vignette
        float vignette = 1.0 - length((uv - 0.5) * 1.4) * t * 0.8;
        color *= vignette;

        // Scanlines
        color -= sin(uv.y * 800.0 + u_time * 10.0) * t * 0.03;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const postProcess = new BABYLON.PostProcess(
      'corruptionEffect',
      'corruption',
      ['u_tension', 'u_time'],
      null,
      1.0,
      scene.activeCamera,
    );

    postProcess.onApply = (effect) => {
      effect.setFloat('u_tension', useLevelStore.getState().tension);
      effect.setFloat('u_time', performance.now() / 1000);
    };

    effectRef.current = postProcess;

    return () => {
      postProcess.dispose();
    };
  }, [scene]);

  return null;
}
