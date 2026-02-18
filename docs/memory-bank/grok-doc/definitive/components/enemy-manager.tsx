// components/enemy-manager.tsx
"use client"

import React, { useEffect, useRef } from 'react';
import { useEntities } from 'miniplex-react';
import * as YUKA from 'yuka';
import * as BABYLON from 'babylonjs';
import { world } from '@/game/world';
import { generateFromSeed } from '@/lib/seed-factory';
import { useSeedStore } from '@/store/seed-store';
import { NeonRaymarcher } from '@/components/ui/neon-raymarcher'; // reuse for visual

export function EnemyManager() {
  const { rng } = useSeedStore();
  const enemies = useEntities((e) => e.enemy);

  const yukaManagerRef = useRef<YUKA.Manager>(new YUKA.Manager());

  // Spawn wave based on current buried seed
  const spawnWave = () => {
    const { enemyConfig } = generateFromSeed();

    for (let i = 0; i < enemyConfig.amount; i++) {
      const entity = world.add({
        enemy: true,
        yukaAgent: new YUKA.Agent(),
        visualMesh: null as any,
        config: enemyConfig,
        health: 3,
        type: enemyConfig.behavior,
      });

      // Create visual (neon holographic box)
      const mesh = BABYLON.MeshBuilder.CreateBox(`enemy${i}`, { size: 0.35 }, scene);
      mesh.material = new BABYLON.StandardMaterial("enemyMat", scene);
      (mesh.material as BABYLON.StandardMaterial).emissiveColor = BABYLON.Color3.FromHexString(enemyConfig.colorTint);
      (mesh.material as BABYLON.StandardMaterial).alpha = 0.85;
      mesh.position.set(
        (Math.random() - 0.5) * 8,
        12 + Math.random() * 6,
        -2 + Math.random() * 4
      );
      entity.visualMesh = mesh;

      // Yuka setup
      const agent = entity.yukaAgent;
      agent.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
      agent.maxSpeed = enemyConfig.speed * 4;

      // Behavior based on seed trait
      if (enemyConfig.behavior === 'seek') {
        const seekBehavior = new YUKA.SeekBehavior(new YUKA.Vector3(0, -1, 0)); // toward Sonny core
        agent.steering.add(seekBehavior);
      } else if (enemyConfig.behavior === 'zigzag') {
        const wander = new YUKA.WanderBehavior();
        wander.radius = 2.5;
        wander.distance = 6;
        agent.steering.add(wander);
      } else if (enemyConfig.behavior === 'split') {
        // split on hit - handled in collision
      } else {
        const wander = new YUKA.WanderBehavior();
        agent.steering.add(wander);
      }

      yukaManagerRef.current.add(agent);
    }
  };

  // Main Yuka update loop
  useBeforeRender((scene, delta) => {
    yukaManagerRef.current.update(delta / 1000);

    // Update visuals
    enemies.forEach(entity => {
      if (entity.visualMesh && entity.yukaAgent) {
        entity.visualMesh.position.set(
          entity.yukaAgent.position.x,
          entity.yukaAgent.position.y,
          entity.yukaAgent.position.z
        );
        entity.visualMesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
          entity.yukaAgent.rotation.x,
          entity.yukaAgent.rotation.y,
          entity.yukaAgent.rotation.z
        );
      }

      // Bottom collision = tension spike
      if (entity.visualMesh && entity.visualMesh.position.y < -1.5) {
        entity.tension = Math.min(1, entity.tension + 0.15); // global tension from world
        world.remove(entity);
        entity.visualMesh.dispose();
      }
    });
  });

  // Spawn first wave on mount
  useEffect(() => {
    spawnWave();
    // Respawn on new seed
    const unsub = useSeedStore.subscribe(() => spawnWave());
    return unsub;
  }, []);

  return null; // purely system component
}