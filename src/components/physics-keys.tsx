'use client';

import * as BABYLON from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';

interface KeyPhysicsBinding {
  body: BABYLON.PhysicsBody;
  anchorBody: BABYLON.PhysicsBody;
  constraint: BABYLON.Physics6DoFConstraint;
  shape: BABYLON.PhysicsShape;
  anchorShape: BABYLON.PhysicsShape;
  anchorMesh: BABYLON.Mesh;
}

/**
 * Physics Keys — Havok Physics V2 on keycap meshes.
 *
 * Keycaps are physically constrained with a 6DoF joint:
 * - X/Z translation locked
 * - Rotation fully locked
 * - Y translation limited to a short key-travel range
 * - Y-axis position motor acts as a spring-return to resting height
 */
export default function PhysicsKeys() {
  const scene = useScene();
  const pluginRef = useRef<BABYLON.HavokPlugin | null>(null);
  const bindingsRef = useRef<KeyPhysicsBinding[]>([]);
  const disposedRef = useRef(false);

  useEffect(() => {
    if (!scene) return;
    disposedRef.current = false;

    const cleanupBindings = () => {
      for (const b of bindingsRef.current) {
        b.constraint.dispose();
        b.body.dispose();
        b.anchorBody.dispose();
        b.shape.dispose();
        b.anchorShape.dispose();
        b.anchorMesh.dispose();
      }
      bindingsRef.current = [];
    };

    const initPhysics = async () => {
      try {
        const havokModule = await import('@babylonjs/havok');
        const havokInstance = await havokModule.default();

        if (disposedRef.current) return;

        const plugin = new BABYLON.HavokPlugin(true, havokInstance);
        scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), plugin);
        pluginRef.current = plugin;

        scene.onAfterRenderObservable.addOnce(() => {
          if (disposedRef.current) return;

          const keycapMeshes = scene.meshes.filter(
            (m) => m.name.startsWith('decorKey') || m.name === 'pauseKey' || m.name.includes('Keycap'),
          );

          for (const mesh of keycapMeshes) {
            let body: BABYLON.PhysicsBody | null = null;
            let anchorBody: BABYLON.PhysicsBody | null = null;
            let constraint: BABYLON.Physics6DoFConstraint | null = null;
            let shape: BABYLON.PhysicsShape | null = null;
            let anchorShape: BABYLON.PhysicsShape | null = null;
            let anchorMesh: BABYLON.Mesh | null = null;

            try {
              body = new BABYLON.PhysicsBody(mesh, BABYLON.PhysicsMotionType.DYNAMIC, false, scene);

              const extents = mesh.getBoundingInfo().boundingBox.extendSize.scale(2);
              shape = new BABYLON.PhysicsShapeBox(
                BABYLON.Vector3.Zero(),
                BABYLON.Quaternion.Identity(),
                new BABYLON.Vector3(extents.x, extents.y, extents.z),
                scene,
              );
              shape.material = { friction: 0.6, restitution: 0.05 };
              body.shape = shape;
              body.setMassProperties({ mass: mesh.name === 'pauseKey' ? 1.2 : 0.8 });
              body.setLinearDamping(4);
              body.setAngularDamping(12);

              anchorMesh = BABYLON.MeshBuilder.CreateBox(`${mesh.name}_anchor`, { size: 0.01 }, scene);
              const worldPos = mesh.getAbsolutePosition();
              const worldRotation = BABYLON.Quaternion.FromRotationMatrix(mesh.getWorldMatrix().getRotationMatrix());
              anchorMesh.position.copyFrom(worldPos);
              anchorMesh.rotationQuaternion = worldRotation;
              anchorMesh.isVisible = false;
              anchorMesh.isPickable = false;
              anchorMesh.parent = null;

              anchorBody = new BABYLON.PhysicsBody(anchorMesh, BABYLON.PhysicsMotionType.STATIC, false, scene);
              anchorShape = new BABYLON.PhysicsShapeBox(
                BABYLON.Vector3.Zero(),
                BABYLON.Quaternion.Identity(),
                new BABYLON.Vector3(0.01, 0.01, 0.01),
                scene,
              );
              anchorBody.shape = anchorShape;

              constraint = new BABYLON.Physics6DoFConstraint(
                {
                  pivotA: BABYLON.Vector3.Zero(),
                  pivotB: BABYLON.Vector3.Zero(),
                  axisA: BABYLON.Vector3.Right(),
                  axisB: BABYLON.Vector3.Right(),
                  perpAxisA: BABYLON.Vector3.Forward(),
                  perpAxisB: BABYLON.Vector3.Forward(),
                  collision: false,
                },
                [
                  { axis: BABYLON.PhysicsConstraintAxis.LINEAR_X, minLimit: 0, maxLimit: 0 },
                  {
                    axis: BABYLON.PhysicsConstraintAxis.LINEAR_Y,
                    minLimit: -0.055,
                    maxLimit: 0.006,
                    stiffness: 300,
                    damping: 32,
                  },
                  { axis: BABYLON.PhysicsConstraintAxis.LINEAR_Z, minLimit: 0, maxLimit: 0 },
                  { axis: BABYLON.PhysicsConstraintAxis.ANGULAR_X, minLimit: 0, maxLimit: 0 },
                  { axis: BABYLON.PhysicsConstraintAxis.ANGULAR_Y, minLimit: 0, maxLimit: 0 },
                  { axis: BABYLON.PhysicsConstraintAxis.ANGULAR_Z, minLimit: 0, maxLimit: 0 },
                ],
                scene,
              );

              body.addConstraint(anchorBody, constraint);
              constraint.setAxisMotorType(
                BABYLON.PhysicsConstraintAxis.LINEAR_Y,
                BABYLON.PhysicsConstraintMotorType.POSITION,
              );
              constraint.setAxisMotorTarget(BABYLON.PhysicsConstraintAxis.LINEAR_Y, 0);
              constraint.setAxisMotorMaxForce(BABYLON.PhysicsConstraintAxis.LINEAR_Y, 45);

              bindingsRef.current.push({
                body,
                anchorBody,
                constraint,
                shape,
                anchorShape,
                anchorMesh,
              });
            } catch (err) {
              constraint?.dispose();
              body?.dispose();
              anchorBody?.dispose();
              shape?.dispose();
              anchorShape?.dispose();
              anchorMesh?.dispose();
              console.error(`[Physics] Failed to add constrained body to ${mesh.name}:`, err);
            }
          }
        });

        console.info('[Physics] Havok constrained key physics initialized');
      } catch (err) {
        console.error('[Physics] Havok WASM failed to load:', err);
      }
    };

    initPhysics();

    return () => {
      disposedRef.current = true;
      cleanupBindings();
      if (pluginRef.current && scene.isPhysicsEnabled()) {
        scene.disablePhysicsEngine();
        pluginRef.current = null;
      }
    };
  }, [scene]);

  return null;
}
