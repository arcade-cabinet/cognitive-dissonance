'use client';
import * as BABYLON from '@babylonjs/core';
import React from 'react';
import { Engine, Scene, useScene } from 'reactylon';

export default function ModernReferenceScene() {
  const meshRef = React.useRef<BABYLON.Mesh>(null!);
  const scene = useScene();

  React.useEffect(() => {
    if (!meshRef.current) return;
    const observer = scene.onBeforeRenderObservable.add(() => {
      meshRef.current.rotation.y += 0.008;
    });
    return () => scene.onBeforeRenderObservable.remove(observer);
  }, [scene]);

  return (
    <Engine 
      antialias 
      adaptToDeviceRatio={true}
      forceWebGL={true}
      engineOptions={{ audioEngine: false, powerPreference: "high-performance" }}
    >
      <Scene clearColor={new BABYLON.Color4(0, 0, 0.05, 1)}>
        <hemisphericLight name="hLight" direction={new BABYLON.Vector3(0, 1, 0)} intensity={0.8} />
        <pointLight name="pLight" position={new BABYLON.Vector3(3, 5, -4)} intensity={1.8} />

        <cylinder
          ref={meshRef}
          name="modernCylinder"
          options={{ height: 2.2, diameter: 1, tessellation: 48 }}
          position={[0, 1.2, 0]}
        >
          <pbrMaterial
            metallic={0.85}
            roughness={0.15}
            albedoColor={new BABYLON.Color3(0.05, 0.75, 1)}
          />
        </cylinder>

        {/* Add your ShaderMaterial sphere here as before */}
      </Scene>
    </Engine>
  );
}