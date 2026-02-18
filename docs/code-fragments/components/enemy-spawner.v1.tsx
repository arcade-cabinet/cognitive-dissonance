// components/enemy-spawner.tsx
"use client"

import React, { useRef, useEffect } from 'react';
import { useBeforeRender } from 'reactylon';
import { useEntity } from 'miniplex-react';
import { world } from '@/game/world';
import { useSeedStore } from '@/store/seed-store';
import { useLevelStore } from '@/store/level-store';
import { generateFromSeed } from '@/lib/seed-factory';
import * as YUKA from 'yuka';
import * as BABYLON from 'babylonjs';
import { NeonRaymarcher } from '@/components/ui/neon-raymarcher';
import { CrystallineCube } from '@/components/ui/crystalline-cube';

export function EnemySpawner({ tension, sphereRef }: { 
  tension: number; 
  sphereRef: React.RefObject<BABYLON.Mesh> 
}) {
  const yukaManager = useRef(new YUKA.Manager());
  const enemies = useRef<any[]>([]);

  const { rng } = useSeedStore();
  const { currentLevel } = useLevelStore();

  const spawnWave = () => {
    const { enemyConfig } = generateFromSeed();
    const levelMultiplier = Math.pow(1.35, currentLevel - 1);
    const isBossWave = tension > 0.7 && Math.random() > 0.6;

    for (let i = 0; i < Math.floor(enemyConfig.amount * levelMultiplier); i++) {
      const startY = 18 + Math.random() * 10 * levelMultiplier;
      const startX = (Math.random() - 0.5) * 14 * levelMultiplier;
      const startZ = -4 + Math.random() * 6;

      let visual: BABYLON.Mesh;

      if (isBossWave && i === 0) {
        visual = new CrystallineCube({
          complexity: 5 + tension * 5,
          colorShift: tension * 0.8,
          lightIntensity: 2.8,
        });
      } else {
        visual = new NeonRaymarcher({
          animationState: { /* seed-derived state */ },
          amount: Math.floor(3 + rng() * 5),
        });
      }

      visual.position = new BABYLON.Vector3(startX, startY, startZ);

      const agent = new YUKA.Agent();
      agent.position.set(startX, startY, startZ);
      agent.maxSpeed = enemyConfig.speed * levelMultiplier * 5;

      if (enemyConfig.behavior === 'seek') {
        agent.steering.add(new YUKA.SeekBehavior(new YUKA.Vector3(0, 0.4, 0)));
      } else if (enemyConfig.behavior === 'zigzag') {
        const wander = new YUKA.WanderBehavior();
        wander.radius = 3.5;
        wander.distance = 8;
        agent.steering.add(wander);
      } else {
        agent.steering.add(new YUKA.WanderBehavior());
      }

      yukaManager.current.add(agent);

      enemies.current.push({
        agent,
        visual,
        health: isBossWave ? 8 : 3,
        isBoss: isBossWave,
      });
    }
  };

  useBeforeRender((scene, delta) => {
    const dt = delta / 1000;
    const curTension = tension;

    yukaManager.current.update(dt);

    // Update visuals
    for (let i = enemies.current.length - 1; i >= 0; i--) {
      const e = enemies.current[i];
      if (e.visual && e.agent) {
        e.visual.position.set(e.agent.position.x, e.agent.position.y, e.agent.position.z);
      }

      // Reached sphere?
      if (e.visual && sphereRef.current) {
        const dist = BABYLON.Vector3.Distance(e.visual.position, sphereRef.current.position);
        if (dist < 0.65) {
          world.set(entity, { tension: Math.min(1, curTension + (e.isBoss ? 0.38 : 0.19)) });
          e.visual.dispose();
          yukaManager.current.remove(e.agent);
          enemies.current.splice(i, 1);
        }
      }
    }

    // Spawn waves with logarithmic frequency
    if (Math.random() < curTension * 1.1 * dt * (3 + currentLevel * 0.8)) {
      spawnWave();
    }
  });

  // Initial wave + new seed trigger
  useEffect(() => {
    spawnWave();
    const unsub = useSeedStore.subscribe(() => {
      enemies.current.forEach(e => e.visual.dispose());
      enemies.current = [];
      spawnWave();
    });
    return unsub;
  }, []);

  return null;
}