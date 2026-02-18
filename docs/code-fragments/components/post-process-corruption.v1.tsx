// components/post-process-corruption.tsx
"use client"

import React, { useEffect } from 'react';
import { useScene } from 'reactylon';
import * as BABYLON from 'babylonjs';

export function PostProcessCorruption({ tension }: { tension: number }) {
  const scene = useScene();

  useEffect(() => {
    const pipeline = new BABYLON.PostProcessRenderPipeline(scene, "corruptionPipeline");

    // Chromatic aberration
    const chromatic = new BABYLON.ChromaticAberrationPostProcess(
      "Chromatic", 1.0, new BABYLON.Vector2(0.5, 0.5), 64, BABYLON.Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false
    );

    // Noise + vignette
    const noise = new BABYLON.NoisePostProcess("Noise", 0.8, scene.getEngine(), BABYLON.Texture.BILINEAR_SAMPLINGMODE, false);

    pipeline.addEffect(new BABYLON.PostProcessRenderEffect(scene.getEngine(), "ChromaticAberration", () => chromatic));
    pipeline.addEffect(new BABYLON.PostProcessRenderEffect(scene.getEngine(), "Noise", () => noise));

    scene.postProcessRenderPipelineManager.addPipeline(pipeline);
    scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("corruptionPipeline", scene.activeCamera!);

    return () => {
      scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("corruptionPipeline", scene.activeCamera!);
    };
  }, []);

  useEffect(() => {
    // Update effects with tension
    const chromatic = scene.getPostProcessByName("Chromatic") as BABYLON.ChromaticAberrationPostProcess;
    if (chromatic) chromatic.aberrationAmount = tension * 8;

    const noise = scene.getPostProcessByName("Noise") as BABYLON.NoisePostProcess;
    if (noise) noise.intensity = tension * 0.6;
  }, [tension]);

  return null;
}