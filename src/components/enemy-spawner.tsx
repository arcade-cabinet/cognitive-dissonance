'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import * as YUKA from 'yuka';
import { type GameEntity, world } from '@/game/world';
import { generateFromSeed } from '@/lib/seed-factory';
import { createCrystallineCubeMaterial } from '@/lib/shaders/crystalline-cube';
import { createNeonRaymarcherMaterial } from '@/lib/shaders/neon-raymarcher';
import { useLevelStore } from '@/store/level-store';
import { useSeedStore } from '@/store/seed-store';

interface Enemy {
  mesh: BABYLON.Mesh;
  material: BABYLON.ShaderMaterial;
  speed: number;
  isBoss: boolean;
  health: number;
  yukaVehicle: YUKA.Vehicle;
  behavior: string;
  /** Miniplex entity for ECS tracking */
  entity: GameEntity;
}

export default function EnemySpawner() {
  const scene = useScene();
  const enemies = useRef<Enemy[]>([]);
  const enemyIdCounter = useRef(0);
  const yukaManager = useRef(new YUKA.EntityManager());
  // Target: the sphere position
  const sphereTarget = useRef(new YUKA.Vector3(0, 0.4, 0));

  useEffect(() => {
    if (!scene) return;

    const spawnWave = () => {
      const { enemyConfig } = generateFromSeed();
      const rng = useSeedStore.getState().rng;
      const curTension = useLevelStore.getState().tension;
      const currentLevel = useLevelStore.getState().currentLevel;
      const levelMultiplier = 1.35 ** (currentLevel - 1);
      const isBossWave = curTension > 0.7 && rng() > 0.6;

      const count = Math.floor(enemyConfig.amount * levelMultiplier);

      for (let i = 0; i < Math.min(count, 16); i++) {
        const startY = 8 + rng() * 5 * levelMultiplier;
        const startX = (rng() - 0.5) * 6;
        const startZ = -2 + rng() * 4;

        const eid = enemyIdCounter.current++;
        const plane = BABYLON.MeshBuilder.CreatePlane(
          `enemy${eid}`,
          { size: isBossWave && i === 0 ? 2.0 : 1.2 },
          scene,
        );
        plane.position = new BABYLON.Vector3(startX, startY, startZ);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        let mat: BABYLON.ShaderMaterial;
        if (isBossWave && i === 0) {
          mat = createCrystallineCubeMaterial(scene);
          mat.setFloat('u_complexity', 5 + curTension * 5);
          mat.setFloat('u_colorShift', curTension * 0.8);
          mat.setFloat('u_lightIntensity', 2.8);
        } else {
          mat = createNeonRaymarcherMaterial(scene);
          mat.setFloat('u_amount', Math.floor(3 + rng() * 5));
        }

        plane.material = mat;

        // Create Yuka vehicle with AI behavior
        const vehicle = new YUKA.Vehicle();
        vehicle.position.set(startX, startY, startZ);
        vehicle.maxSpeed = enemyConfig.speed * levelMultiplier * 2;

        // Assign behavior based on seed
        const behavior = enemyConfig.behavior;
        if (behavior === 'seek') {
          const seekBehavior = new YUKA.SeekBehavior(sphereTarget.current);
          vehicle.steering.add(seekBehavior);
        } else if (behavior === 'wander') {
          const wanderBehavior = new YUKA.WanderBehavior();
          wanderBehavior.radius = 1.5;
          wanderBehavior.distance = 3;
          vehicle.steering.add(wanderBehavior);
          // Also add gentle seek so wander still moves toward sphere
          const gentleSeek = new YUKA.SeekBehavior(sphereTarget.current);
          gentleSeek.weight = 0.3;
          vehicle.steering.add(gentleSeek);
        } else {
          // zigzag / split: use arrive with offset
          const arriveBehavior = new YUKA.ArriveBehavior(sphereTarget.current, 2, 0.5);
          vehicle.steering.add(arriveBehavior);
        }

        yukaManager.current.add(vehicle);

        // Track in Miniplex ECS
        const entity = world.add({
          enemy: true,
          position: { x: startX, y: startY, z: startZ },
          health: isBossWave && i === 0 ? 8 : 3,
          type: behavior as GameEntity['type'],
          isBoss: isBossWave && i === 0,
        });

        enemies.current.push({
          mesh: plane,
          material: mat,
          speed: enemyConfig.speed * levelMultiplier * 2,
          isBoss: isBossWave && i === 0,
          health: isBossWave && i === 0 ? 8 : 3,
          yukaVehicle: vehicle,
          behavior,
          entity,
        });
      }
    };

    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      const t = performance.now() / 1000;
      const curTension = useLevelStore.getState().tension;

      // Update Yuka AI
      yukaManager.current.update(dt);

      // Sync Yuka positions to Babylon meshes and update shaders
      for (let i = enemies.current.length - 1; i >= 0; i--) {
        const e = enemies.current[i];

        // Sync Yuka vehicle position to Babylon mesh
        e.mesh.position.set(e.yukaVehicle.position.x, e.yukaVehicle.position.y, e.yukaVehicle.position.z);

        // Update shader time + uniforms
        e.material.setFloat('u_time', t);
        e.material.setFloat('u_tension', curTension);

        // Set orbiting box positions for neon-raymarcher (relative to billboard center)
        if (!e.isBoss) {
          const posArray: number[] = [];
          for (let j = 0; j < 16; j++) {
            const angle = (t + j) * 1.5;
            posArray.push(Math.sin(angle) * 1.5, Math.cos(angle * 0.7) * 1.2, Math.sin(angle * 0.5) * 0.5);
          }
          e.material.setArray3('u_positions', posArray);
        }

        // Check distance to sphere (radius-based instead of y-threshold)
        const distToSphere = e.yukaVehicle.position.distanceTo(sphereTarget.current);
        if (distToSphere < 0.6) {
          // Split behavior: spawn 2 smaller seekers instead of tension spike
          if (e.behavior === 'split' && e.health > 1) {
            const splitPos = e.yukaVehicle.position;
            for (let s = 0; s < 2; s++) {
              const offset = s === 0 ? 0.3 : -0.3;
              const childId = enemyIdCounter.current++;
              const childPlane = BABYLON.MeshBuilder.CreatePlane(`splitChild${childId}`, { size: 0.6 }, scene);
              childPlane.position = new BABYLON.Vector3(splitPos.x + offset, splitPos.y, splitPos.z + offset);
              childPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

              const childMat = createNeonRaymarcherMaterial(scene);
              childMat.setFloat('u_amount', 2);
              childPlane.material = childMat;

              const childVehicle = new YUKA.Vehicle();
              childVehicle.position.set(splitPos.x + offset, splitPos.y, splitPos.z + offset);
              childVehicle.maxSpeed = e.speed * 1.5; // Children are faster
              childVehicle.steering.add(new YUKA.SeekBehavior(sphereTarget.current));
              yukaManager.current.add(childVehicle);

              const childEntity = world.add({
                enemy: true,
                position: { x: splitPos.x + offset, y: splitPos.y, z: splitPos.z + offset },
                health: 1,
                type: 'seek',
                isBoss: false,
              });

              enemies.current.push({
                mesh: childPlane,
                material: childMat,
                speed: e.speed * 1.5,
                isBoss: false,
                health: 1,
                yukaVehicle: childVehicle,
                behavior: 'seek',
                entity: childEntity,
              });
            }
          } else {
            // Normal tension spike
            useLevelStore.getState().setTension(Math.min(1, curTension + (e.isBoss ? 0.38 : 0.19)));
          }

          yukaManager.current.remove(e.yukaVehicle);
          e.mesh.dispose();
          e.material.dispose();
          world.remove(e.entity);
          enemies.current.splice(i, 1);
        }
      }

      // Spawn waves based on tension
      if (useSeedStore.getState().rng() < curTension * 1.1 * dt * (3 + useLevelStore.getState().currentLevel * 0.8)) {
        spawnWave();
      }
    });

    // Initial wave
    spawnWave();

    // Listen for seed changes
    const unsub = useSeedStore.subscribe(() => {
      enemies.current.forEach((e) => {
        e.mesh.dispose();
        e.material.dispose();
        world.remove(e.entity);
      });
      enemies.current = [];
      spawnWave();
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      unsub();
      enemies.current.forEach((e) => {
        yukaManager.current.remove(e.yukaVehicle);
        e.mesh.dispose();
        e.material.dispose();
        world.remove(e.entity);
      });
      enemies.current = [];
    };
  }, [scene]);

  return null;
}
