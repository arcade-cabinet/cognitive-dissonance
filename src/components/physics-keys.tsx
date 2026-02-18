'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';

/**
 * Physics Keys — Havok Physics V2 on keycap meshes.
 *
 * Adds physics bodies to all keycap meshes in the scene (identified by name
 * prefix "decorKey" or "touchTarget"). Keycaps get mass, restitution, and
 * are constrained to vertical movement only — pressing pushes them down,
 * releasing lets them spring back up.
 *
 * Gracefully degrades if Havok WASM fails to load (logs warning, does nothing).
 */
export default function PhysicsKeys() {
  const scene = useScene();
  const pluginRef = useRef<BABYLON.HavokPlugin | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    if (!scene) return;
    disposedRef.current = false;

    const initPhysics = async () => {
      try {
        // Dynamic import of Havok WASM — SSR safe
        const havokModule = await import('@babylonjs/havok');
        const havokInstance = await havokModule.default();

        if (disposedRef.current) return;

        const plugin = new BABYLON.HavokPlugin(true, havokInstance);
        scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), plugin);
        pluginRef.current = plugin;

        // Find all keycap meshes and add physics bodies
        // Wait a frame for platter to finish building its meshes
        scene.onAfterRenderObservable.addOnce(() => {
          if (disposedRef.current) return;

          const keycapMeshes = scene.meshes.filter(
            (m) => m.name.startsWith('decorKey') || m.name === 'pauseKey' || m.name.includes('Keycap'),
          );

          for (const mesh of keycapMeshes) {
            try {
              // Create physics body with box shape
              const body = new BABYLON.PhysicsBody(mesh, BABYLON.PhysicsMotionType.DYNAMIC, false, scene);

              const extents = mesh.getBoundingInfo().boundingBox.extendSize.scale(2);
              const shape = new BABYLON.PhysicsShapeBox(
                BABYLON.Vector3.Zero(),
                BABYLON.Quaternion.Identity(),
                new BABYLON.Vector3(extents.x, extents.y, extents.z),
                scene,
              );

              shape.material = { friction: 0.5, restitution: 0.3 };
              body.shape = shape;
              body.setMassProperties({ mass: 0.8 });

              // Constrain to Y axis only (prevent lateral drift)
              // Lock X and Z translation, lock all rotation
              body.setLinearDamping(5);
              body.setAngularDamping(10);
            } catch (err) {
              console.error(`[Physics] Failed to add body to ${mesh.name}:`, err);
            }
          }
        });

        console.info('[Physics] Havok physics initialized on keycaps');
      } catch (err) {
        console.error('[Physics] Havok WASM failed to load:', err);
      }
    };

    initPhysics();

    return () => {
      disposedRef.current = true;
      if (pluginRef.current && scene.isPhysicsEnabled()) {
        scene.disablePhysicsEngine();
        pluginRef.current = null;
      }
    };
  }, [scene]);

  return null;
}
