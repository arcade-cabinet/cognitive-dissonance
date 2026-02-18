// components/sps-enemies.tsx
"use client"

import React, { useEffect } from 'react';
import { useScene } from 'reactylon';
import * as BABYLON from 'babylonjs';

export function SPSEnemies({ tension }: { tension: number }) {
  const scene = useScene();

  useEffect(() => {
    const SPS = new BABYLON.SolidParticleSystem("enemiesSPS", scene, { updatable: true });
    const model = BABYLON.MeshBuilder.CreateBox("model", { size: 0.35 }, scene);

    SPS.addShape(model, 120); // up to 120 particles
    model.dispose();

    const mesh = SPS.buildMesh();
    mesh.material = new BABYLON.StandardMaterial("spsMat", scene);
    (mesh.material as BABYLON.StandardMaterial).emissiveColor = new BABYLON.Color3(0.2, 0.8, 1.0);

    SPS.initParticles = () => {
      SPS.recycleParticle = (particle) => {
        particle.position.set(Math.random() * 12 - 6, 18, Math.random() * 6 - 3);
        particle.velocity.set(0, -2 - tension * 4, 0);
        return particle;
      };
    };

    SPS.updateParticle = (particle) => {
      particle.position.addInPlace(particle.velocity);
      if (particle.position.y < 0.4) particle.recycle();
      return particle;
    };

    SPS.setParticles();

    scene.registerBeforeRender(() => SPS.setParticles());

    return () => SPS.dispose();
  }, [tension]);

  return null;
}