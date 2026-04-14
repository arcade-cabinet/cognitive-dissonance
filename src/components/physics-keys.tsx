import {
  HavokPlugin,
  type Mesh,
  MeshBuilder,
  Physics6DoFConstraint,
  PhysicsBody,
  PhysicsConstraintAxis,
  PhysicsConstraintMotorType,
  PhysicsMotionType,
  type PhysicsShape,
  PhysicsShapeBox,
  Quaternion,
  Vector3,
} from '@babylonjs/core';
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';

interface KeyPhysicsBinding {
  body: PhysicsBody;
  anchorBody: PhysicsBody;
  constraint: Physics6DoFConstraint;
  shape: PhysicsShape;
  anchorShape: PhysicsShape;
  anchorMesh: Mesh;
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
  const pluginRef = useRef<HavokPlugin | null>(null);
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

        const plugin = new HavokPlugin(true, havokInstance);
        scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
        pluginRef.current = plugin;

        scene.onAfterRenderObservable.addOnce(() => {
          if (disposedRef.current) return;

          const keycapMeshes = scene.meshes.filter(
            (m) => m.name.startsWith('decorKey') || m.name === 'pauseKey' || m.name.includes('Keycap'),
          );

          for (const mesh of keycapMeshes) {
            let body: PhysicsBody | null = null;
            let anchorBody: PhysicsBody | null = null;
            let constraint: Physics6DoFConstraint | null = null;
            let shape: PhysicsShape | null = null;
            let anchorShape: PhysicsShape | null = null;
            let anchorMesh: Mesh | null = null;

            try {
              body = new PhysicsBody(mesh, PhysicsMotionType.DYNAMIC, false, scene);

              const extents = mesh.getBoundingInfo().boundingBox.extendSize.scale(2);
              shape = new PhysicsShapeBox(
                Vector3.Zero(),
                Quaternion.Identity(),
                new Vector3(extents.x, extents.y, extents.z),
                scene,
              );
              shape.material = { friction: 0.6, restitution: 0.05 };
              body.shape = shape;
              body.setMassProperties({ mass: mesh.name === 'pauseKey' ? 1.2 : 0.8 });
              body.setLinearDamping(4);
              body.setAngularDamping(12);

              anchorMesh = MeshBuilder.CreateBox(`${mesh.name}_anchor`, { size: 0.01 }, scene);
              const worldPos = mesh.getAbsolutePosition();
              const worldRotation = Quaternion.FromRotationMatrix(mesh.getWorldMatrix().getRotationMatrix());
              anchorMesh.position.copyFrom(worldPos);
              anchorMesh.rotationQuaternion = worldRotation;
              anchorMesh.isVisible = false;
              anchorMesh.isPickable = false;
              anchorMesh.parent = null;

              anchorBody = new PhysicsBody(anchorMesh, PhysicsMotionType.STATIC, false, scene);
              anchorShape = new PhysicsShapeBox(
                Vector3.Zero(),
                Quaternion.Identity(),
                new Vector3(0.01, 0.01, 0.01),
                scene,
              );
              anchorBody.shape = anchorShape;

              constraint = new Physics6DoFConstraint(
                {
                  pivotA: Vector3.Zero(),
                  pivotB: Vector3.Zero(),
                  axisA: Vector3.Right(),
                  axisB: Vector3.Right(),
                  perpAxisA: Vector3.Forward(),
                  perpAxisB: Vector3.Forward(),
                  collision: false,
                },
                [
                  { axis: PhysicsConstraintAxis.LINEAR_X, minLimit: 0, maxLimit: 0 },
                  {
                    axis: PhysicsConstraintAxis.LINEAR_Y,
                    minLimit: -0.055,
                    maxLimit: 0.006,
                    stiffness: 300,
                    damping: 32,
                  },
                  { axis: PhysicsConstraintAxis.LINEAR_Z, minLimit: 0, maxLimit: 0 },
                  { axis: PhysicsConstraintAxis.ANGULAR_X, minLimit: 0, maxLimit: 0 },
                  { axis: PhysicsConstraintAxis.ANGULAR_Y, minLimit: 0, maxLimit: 0 },
                  { axis: PhysicsConstraintAxis.ANGULAR_Z, minLimit: 0, maxLimit: 0 },
                ],
                scene,
              );

              body.addConstraint(anchorBody, constraint);
              constraint.setAxisMotorType(PhysicsConstraintAxis.LINEAR_Y, PhysicsConstraintMotorType.POSITION);
              constraint.setAxisMotorTarget(PhysicsConstraintAxis.LINEAR_Y, 0);
              constraint.setAxisMotorMaxForce(PhysicsConstraintAxis.LINEAR_Y, 45);

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
