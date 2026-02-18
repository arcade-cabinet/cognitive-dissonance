'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { world } from '@/game/world';
import { KEYCAP_COLORS, KEYCAP_COUNT } from '@/lib/keycap-colors';
import { useInputStore } from '@/store/input-store';
import { useLevelStore } from '@/store/level-store';
import { useSeedStore } from '@/store/seed-store';

interface Pattern {
  id: number;
  /** Index into KEYCAP_COLORS — only the matching keycap stabilizes this pattern */
  colorIndex: number;
  color: BABYLON.Color3;
  progress: number;
  speed: number;
  angle: number;
  particleSystem: BABYLON.ParticleSystem;
  /** Miniplex entity reference for proper ECS tracking */
  entity: import('@/game/world').GameEntity;
}

export default function PatternStabilizer() {
  const scene = useScene();
  const activePatterns = useRef<Pattern[]>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!scene) return;

    const spawnPattern = () => {
      const rng = useSeedStore.getState().rng;
      const curTension = useLevelStore.getState().tension;

      // Pick a color index from the keycap palette — seeded for determinism
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

      // Add to Miniplex ECS for tracking
      const entity = world.add({
        pattern: true,
        progress: 0,
        speed,
        color: `hsl(${kc.hue}, 85%, 65%)`,
        colorIndex,
      });

      const pattern: Pattern = {
        id: patternId,
        colorIndex,
        color,
        progress: 0,
        speed,
        angle: rng() * 360 * (Math.PI / 180),
        particleSystem: ps,
        entity,
      };

      activePatterns.current.push(pattern);
    };

    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      const curTension = useLevelStore.getState().tension;

      // Spawn new patterns based on tension
      if (useSeedStore.getState().rng() < curTension * 1.6 * dt * 7) {
        spawnPattern();
      }

      // Update active patterns
      const heldKeycaps = useInputStore.getState().heldKeycaps;

      for (let i = activePatterns.current.length - 1; i >= 0; i--) {
        const p = activePatterns.current[i];
        p.progress += p.speed * dt;

        // Move particle emitter along radius from sphere center
        const radius = p.progress * 0.52;
        p.particleSystem.emitter = new BABYLON.Vector3(Math.cos(p.angle) * radius, 0.4, Math.sin(p.angle) * radius);

        // Per-color matching: only the MATCHING keycap stabilizes this pattern
        if (heldKeycaps.has(p.colorIndex)) {
          p.progress = Math.max(0, p.progress - 2.4 * dt);
        }

        // Sync progress to Miniplex entity
        if (p.entity.progress !== undefined) p.entity.progress = p.progress;

        // Reached rim → tension spike + dispatch escape event for spatial audio
        if (p.progress >= 1.0) {
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

        // Fully stabilized → coherence boost + dispatch chime event
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
