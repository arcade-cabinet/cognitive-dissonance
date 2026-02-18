'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';

interface DiegeticGUIProps {
  coherence: number;
}

/**
 * Diegetic coherence display — a glowing arc ring around the sphere track
 * on the platter. Two layers:
 *   1. Background ring: full torus, always visible, dim
 *   2. Foreground arc: tube mesh following a partial circular path,
 *      fills proportionally with coherence
 *
 * The arc is the only "HUD" — and it's etched into the machine itself.
 */
export default function DiegeticGUI({ coherence }: DiegeticGUIProps) {
  const scene = useScene();
  const bgRingRef = useRef<BABYLON.Mesh | null>(null);
  const bgMatRef = useRef<BABYLON.StandardMaterial | null>(null);
  const fgArcRef = useRef<BABYLON.Mesh | null>(null);
  const fgMatRef = useRef<BABYLON.StandardMaterial | null>(null);
  const lastArcCoherence = useRef(-1);

  // Create background ring (full, dim, always visible)
  useEffect(() => {
    if (!scene) return;

    const bgRing = BABYLON.MeshBuilder.CreateTorus(
      'coherenceBgRing',
      { diameter: 0.84, thickness: 0.02, tessellation: 64 },
      scene,
    );
    bgRing.position.y = -1.6 + 0.4;
    bgRing.rotation.x = Math.PI / 2;
    bgRingRef.current = bgRing;

    const bgMat = new BABYLON.StandardMaterial('coherenceBgMat', scene);
    bgMat.emissiveColor = new BABYLON.Color3(0.1, 0.15, 0.2);
    bgMat.alpha = 0.15;
    bgMat.disableLighting = true;
    bgRing.material = bgMat;
    bgMatRef.current = bgMat;

    return () => {
      bgRing.dispose();
      bgMat.dispose();
    };
  }, [scene]);

  // Update foreground arc based on coherence — throttled mesh recreation
  useEffect(() => {
    if (!scene) return;

    // Only recreate if coherence changed by >= 2 units (avoids excessive disposal)
    const bucketedCoherence = Math.round(coherence / 2) * 2;
    if (bucketedCoherence === lastArcCoherence.current) return;
    lastArcCoherence.current = bucketedCoherence;

    // Dispose previous arc
    if (fgArcRef.current) {
      fgArcRef.current.dispose();
      fgArcRef.current = null;
    }

    // Build a partial circular path for the tube
    const clampedCoherence = Math.max(0, Math.min(100, coherence));
    const arcFraction = Math.max(0.01, clampedCoherence / 100);
    const radius = 0.42; // half of diameter 0.84
    const segments = Math.max(4, Math.floor(64 * arcFraction));
    const path: BABYLON.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * arcFraction * Math.PI * 2;
      path.push(new BABYLON.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }

    const fgArc = BABYLON.MeshBuilder.CreateTube(
      'coherenceFgArc',
      { path, radius: 0.012, tessellation: 12, cap: BABYLON.Mesh.CAP_ALL },
      scene,
    );
    fgArc.position.y = -1.6 + 0.4;
    fgArcRef.current = fgArc;

    // Create or reuse material
    if (!fgMatRef.current) {
      const fgMat = new BABYLON.StandardMaterial('coherenceFgMat', scene);
      fgMat.disableLighting = true;
      fgMatRef.current = fgMat;
    }

    // Color shifts with coherence: low = red-orange, high = bright green-cyan
    const intensity = clampedCoherence / 100;
    fgMatRef.current.emissiveColor = new BABYLON.Color3(
      intensity < 0.5 ? 1.0 - intensity : 0,
      intensity,
      intensity * 0.6,
    );
    fgMatRef.current.alpha = 0.3 + intensity * 0.5;
    fgArc.material = fgMatRef.current;
  }, [scene, coherence]);

  // Cleanup all resources on unmount
  useEffect(() => {
    return () => {
      fgArcRef.current?.dispose();
      fgArcRef.current = null;
      fgMatRef.current?.dispose();
      fgMatRef.current = null;
      bgRingRef.current?.dispose();
      bgRingRef.current = null;
      bgMatRef.current?.dispose();
      bgMatRef.current = null;
      lastArcCoherence.current = -1;
    };
  }, []);

  return null;
}
