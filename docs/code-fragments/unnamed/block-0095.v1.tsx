'use client';
import * as BABYLON from '@babylonjs/core';
import React from 'react';
import { Engine, Scene, useScene } from 'reactylon';

export default function ReferenceScene() {
  const meshRef = React.useRef<BABYLON.Mesh>(null!);
  const scene = useScene();

  React.useEffect(() => {
    if (!meshRef.current) return;
    const observer = scene.registerBeforeRender(() => {
      meshRef.current.rotation.y += 0.01;
    });
    return () => scene.unregisterBeforeRender(observer);
  }, [scene]);

  return (
    <Engine antialias alpha>
      <Scene clearColor={new BABYLON.Color4(0, 0, 0, 1)}>
        <hemisphericLight name="light1" direction={new BABYLON.Vector3(0, 1, 0)} intensity={0.7} />
        <pointLight name="point1" position={[2, 4, -3]} intensity={1.5} />

        <cylinder
          ref={meshRef}
          name="rotatingCylinder"
          options={{ height: 2, diameter: 1, tessellation: 32 }}
          position={[0, 1, 0]}
        >
          <pbrMaterial
            name="cylMat"
            metallic={0.9}
            roughness={0.2}
            albedoColor={new BABYLON.Color3(0.1, 0.8, 1)}
          />
        </cylinder>

        <sphere name="shaderSphere" options={{ diameter: 1 }} position={[-3, 1, 0]}>
          {/* Shader assigned imperatively in separate effect (see GAP 1) */}
        </sphere>

        <particleSystem
          name="sparkles"
          capacity={200}
          particleTexture={new BABYLON.Texture("spark.png", scene)}
          emitter={new BABYLON.Vector3(0, 2, 0)}
          minSize={0.01}
          maxSize={0.05}
          minLifeTime={1}
          maxLifeTime={3}
          emitRate={50}
        />

      </Scene>
    </Engine>
  );
}