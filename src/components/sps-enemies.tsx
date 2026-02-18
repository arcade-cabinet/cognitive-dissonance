'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { useLevelStore } from '@/store/level-store';

interface SPSEnemiesProps {
  tension: number;
}

export default function SPSEnemies({ tension }: SPSEnemiesProps) {
  const scene = useScene();
  const spsRef = useRef<BABYLON.SolidParticleSystem | null>(null);

  useEffect(() => {
    if (!scene) return;

    const SPS = new BABYLON.SolidParticleSystem('enemiesSPS', scene, { updatable: true });
    const model = BABYLON.MeshBuilder.CreateBox('spsModel', { size: 0.35 }, scene);
    SPS.addShape(model, 120);
    model.dispose();

    const mesh = SPS.buildMesh();
    const mat = new BABYLON.StandardMaterial('spsMat', scene);
    mat.emissiveColor = new BABYLON.Color3(0.2, 0.8, 1.0);
    mat.alpha = 0.7;
    mesh.material = mat;

    spsRef.current = SPS;

    // Initialize particles
    SPS.initParticles = () => {
      for (let i = 0; i < SPS.nbParticles; i++) {
        const p = SPS.particles[i];
        p.alive = false;
        p.position.set(0, -100, 0);
      }
    };
    SPS.initParticles();

    SPS.updateParticle = (particle) => {
      if (!particle.alive) return particle;

      const curTension = useLevelStore.getState().tension;
      particle.position.y -= (2 + curTension * 4) * (scene.getEngine().getDeltaTime() / 1000);
      particle.rotation.x += 0.02;
      particle.rotation.y += 0.01;

      if (particle.position.y < 0.4) {
        particle.alive = false;
        particle.position.y = -100;
      }

      return particle;
    };

    const observer = scene.onBeforeRenderObservable.add(() => {
      SPS.setParticles();

      // Randomly activate particles based on tension
      const curTension = useLevelStore.getState().tension;
      if (Math.random() < curTension * 0.3) {
        for (let i = 0; i < SPS.nbParticles; i++) {
          const p = SPS.particles[i];
          if (!p.alive) {
            p.alive = true;
            p.position.set((Math.random() - 0.5) * 8, 8 + Math.random() * 4, (Math.random() - 0.5) * 4);
            break;
          }
        }
      }
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      SPS.dispose();
    };
  }, [scene]);

  return null;
}
