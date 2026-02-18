// components/physics-keys.tsx
"use client"

import React, { useEffect } from 'react';
import { useScene } from 'reactylon';
import * as BABYLON from 'babylonjs';

export function PhysicsKeys() {
  const scene = useScene();

  useEffect(() => {
    scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.AmmoJSPlugin());

    // Add impostors to keycaps and lever (call this after platter is built)
    // Example:
    // keycap.physicsImpostor = new BABYLON.PhysicsImpostor(keycap, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0.8, restitution: 0.3 }, scene);

    return () => {
      scene.disablePhysicsEngine();
    };
  }, []);

  return null;
}