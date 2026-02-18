'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';

interface DiegeticGUIProps {
  coherence: number;
}

export default function DiegeticGUI({ coherence }: DiegeticGUIProps) {
  const scene = useScene();
  const ringRef = useRef<BABYLON.Mesh | null>(null);
  const ringMatRef = useRef<BABYLON.StandardMaterial | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Coherence ring around the sphere track on the platter
    const ring = BABYLON.MeshBuilder.CreateTorus(
      'coherenceRing',
      { diameter: 0.84, thickness: 0.02, tessellation: 64 },
      scene,
    );
    ring.position.y = -1.6 + 0.4;
    ring.rotation.x = Math.PI / 2;
    ringRef.current = ring;

    const mat = new BABYLON.StandardMaterial('coherenceRingMat', scene);
    mat.emissiveColor = new BABYLON.Color3(0, 1, 0.6);
    mat.alpha = 0.6;
    mat.disableLighting = true;
    ring.material = mat;
    ringMatRef.current = mat;

    return () => {
      ring.dispose();
      mat.dispose();
      ringMatRef.current = null;
    };
  }, [scene]);

  // Update ring brightness based on coherence
  useEffect(() => {
    if (!ringMatRef.current) return;

    const intensity = coherence / 100;
    ringMatRef.current.emissiveColor = new BABYLON.Color3(
      intensity < 0.5 ? 1.0 - intensity : 0,
      intensity,
      intensity * 0.6,
    );
    ringMatRef.current.alpha = 0.3 + intensity * 0.5;
  }, [coherence]);

  return null;
}
