'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { world } from '@/game/world';
import { runFixedSteps, spawnIntervalSeconds } from '@/lib/fixed-step';
import { KEYCAP_COLORS, KEYCAP_COUNT } from '@/lib/keycap-colors';
import { useInputStore } from '@/store/input-store';
import { useLevelStore } from '@/store/level-store';
import { useSeedStore } from '@/store/seed-store';

interface Pattern {
  id: number;
  colorIndex: number;
  color: BABYLON.Color3;
  progress: number;
  speed: number;
  angle: number;
  particleSystem: BABYLON.ParticleSystem;
  entity: import('@/game/world').GameEntity;
}

export default function PatternStabilizer() {
  const scene = useScene();
  const activePatterns = useRef<Pattern[]>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!scene) return;

    const fixedStep = 1 / 30;
    const fixedState = { accumulator: 0 };
    let spawnTimer = 0;

    const scheduleNextSpawn = () => {
      const rng = useSeedStore.getState().rng;
      const tension = useLevelStore.getState().tension;
      spawnTimer = spawnIntervalSeconds(tension, rng, 0.16, 1.1);
    };

    const spawnPattern = () => {
      const rng = useSeedStore.getState().rng;
      const curTension = useLevelStore.getState().tension;

      const colorIndex = Math.floor(rng() * KEYCAP_COUNT);
      const kc = KEYCAP_COLORS[colorIndex];
      const color = kc.color3;

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

      const entity = world.add({
        pattern: true,
        progress: 0,
        speed,
        color: `hsl(${kc.hue}, 85%, 65%)`,
        colorIndex,
      });

      activePatterns.current.push({
        id: patternId,
        colorIndex,
        color,
        progress: 0,
        speed,
        angle: rng() * Math.PI * 2,
        particleSystem: ps,
        entity,
      });
    };

    scheduleNextSpawn();

    const tick = (dt: number) => {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnPattern();
        scheduleNextSpawn();
      }

      const heldKeycaps = useInputStore.getState().heldKeycaps;

      for (let i = activePatterns.current.length - 1; i >= 0; i--) {
        const p = activePatterns.current[i];
        p.progress += p.speed * dt;

        const radius = p.progress * 0.52;
        p.particleSystem.emitter = new BABYLON.Vector3(Math.cos(p.angle) * radius, 0.4, Math.sin(p.angle) * radius);

        if (heldKeycaps.has(p.colorIndex)) {
          p.progress = Math.max(0, p.progress - 2.4 * dt);
        }

        if (p.entity.progress !== undefined) p.entity.progress = p.progress;

        if (p.progress >= 1.0) {
          const curTension = useLevelStore.getState().tension;
          useLevelStore.getState().setTension(Math.min(1, curTension + 0.22));
          window.dispatchEvent(
            new CustomEvent('patternEscaped', {
              detail: { colorIndex: p.colorIndex, angle: p.angle },
            }),
          );
          p.particleSystem.stop();
          p.particleSystem.dispose();
          world.remove(p.entity);
          activePatterns.current.splice(i, 1);
          continue;
        }

        if (p.progress <= 0) {
          useLevelStore.getState().addCoherence(3);
          window.dispatchEvent(
            new CustomEvent('patternStabilized', {
              detail: { colorIndex: p.colorIndex },
            }),
          );
          p.particleSystem.stop();
          p.particleSystem.dispose();
          world.remove(p.entity);
          activePatterns.current.splice(i, 1);
        }
      }
    };

    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      runFixedSteps(fixedState, dt, fixedStep, tick);
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      activePatterns.current.forEach((p) => {
        p.particleSystem.stop();
        p.particleSystem.dispose();
        world.remove(p.entity);
      });
      activePatterns.current = [];
    };
  }, [scene]);

  return null;
}
