// components/diegetic-gui.tsx
"use client"

import React, { useEffect } from 'react';
import { useScene } from 'reactylon';
import * as BABYLON from 'babylonjs';

export function DiegeticGUI({ coherence }: { coherence: number }) {
  const scene = useScene();

  useEffect(() => {
    const advancedTexture = BABYLON.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

    const ring = new BABYLON.GUI.Ellipse();
    ring.width = "180px";
    ring.height = "180px";
    ring.color = "cyan";
    ring.thickness = 6;
    advancedTexture.addControl(ring);

    // Coherence arc
    const arc = new BABYLON.GUI.Arc();
    arc.color = "lime";
    arc.thickness = 12;
    arc.startAngle = 0;
    arc.endAngle = (coherence / 100) * 360;
    ring.addControl(arc);

    return () => advancedTexture.dispose();
  }, [coherence]);

  return null;
}