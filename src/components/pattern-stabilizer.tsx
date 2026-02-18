'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { world } from '@/game/world';
import { generateFromSeed } from '@/lib/seed-factory';
import { useInputStore } from '@/store/input-store';
import { useLevelStore } from '@/store/level-store';
import { useSeedStore } from '@/store/seed-store';

interface Pattern {
  id: number;
  color: BABYLON.Color3;
  progress: number;
  speed: number;
  angle: number;
  particleSystem: BABYLON.ParticleSystem;
}

export default function PatternStabilizer() {
  const scene = useScene();
  const activePatterns = useRef<Pattern[]>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!scene) return;

    const spawnPattern = () => {
      const rng = useSeedStore.getState().rng;
      const { enemyConfig } = generateFromSeed();
      const hue = parseFloat(enemyConfig.colorTint.match(/\d+/)?.[0] || '180');
      const color = BABYLON.Color3.FromHSV(hue, 0.85, 0.65);
      const curTension = useLevelStore.getState().tension;
      const speed = 0.3 + rng() * curTension * 1.2;

      const patternId = idCounter.current++;
      const ps = new BABYLON.ParticleSystem(`pattern${patternId}`, 60, scene);
      ps.emitter = new BABYLON.Vector3(0, 0.4, 0);
      ps.minSize = 0.015;
      ps.maxSize = 0.045;
      ps.color1 = new BABYLON.Color4(color.r, color.g, color.b, 1);
      ps.color2 = new BABYLON.Color4(color.r * 0.5, color.g * 0.5, color.b * 0.5, 0.5);
      ps.emitRate = 70;
      ps.minLifeTime = 1.8;
      ps.maxLifeTime = 3.2;
      ps.createPointEmitter(new BABYLON.Vector3(-0.05, -0.05, -0.05), new BABYLON.Vector3(0.05, 0.05, 0.05));
      ps.start();

      const pattern: Pattern = {
        id: patternId,
        color,
        progress: 0,
        speed,
        angle: rng() * 360 * (Math.PI / 180),
        particleSystem: ps,
      };

      activePatterns.current.push(pattern);

      // Also add to Miniplex
      world.add({
        pattern: true,
        progress: 0,
        speed,
        color: `hsl(${hue}, 85%, 65%)`,
      });
    };

    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      const curTension = useLevelStore.getState().tension;

      // Spawn new patterns based on tension
      if (useSeedStore.getState().rng() < curTension * 1.6 * dt * 7) {
        spawnPattern();
      }

      // Update active patterns
      for (let i = activePatterns.current.length - 1; i >= 0; i--) {
        const p = activePatterns.current[i];
        p.progress += p.speed * dt;

        // Move particle emitter along radius
        const radius = p.progress * 0.52;
        p.particleSystem.emitter = new BABYLON.Vector3(Math.cos(p.angle) * radius, 0.4, Math.sin(p.angle) * radius);

        // Check if being stabilized (any keycap held = pull back ALL patterns)
        const isAnyHeld = useInputStore.getState().isAnyHeld;
        if (isAnyHeld) {
          p.progress = Math.max(0, p.progress - 2.4 * dt);
        }

        // Reached rim = tension spike
        if (p.progress >= 1.0) {
          useLevelStore.getState().setTension(Math.min(1, curTension + 0.22));
          p.particleSystem.stop();
          p.particleSystem.dispose();
          activePatterns.current.splice(i, 1);
        }

        // Fully stabilized = coherence boost
        if (p.progress <= 0) {
          useLevelStore.getState().addCoherence(3);
          p.particleSystem.stop();
          p.particleSystem.dispose();
          activePatterns.current.splice(i, 1);
        }
      }
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      activePatterns.current.forEach((p) => {
        p.particleSystem.stop();
        p.particleSystem.dispose();
      });
      activePatterns.current = [];
    };
  }, [scene]);

  return null;
}
