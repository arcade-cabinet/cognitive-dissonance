// components/ai-sphere.tsx
"use client"

import React, { useRef, useEffect } from 'react';
import { TransformNode, Sphere, Cylinder, useBeforeRender, useScene, Engine, Scene } from 'reactylon';
import { useEntity } from 'miniplex-react';
import { world } from '@/game/world';
import { useSeedStore } from '@/store/seed-store';
import { useLevelStore } from '@/store/level-store';
import * as BABYLON from 'babylonjs';
import { gsap } from 'gsap';

export function AISphere({ initialTension = 0.12 }: { initialTension?: number }) {
  const scene = useScene();

  const entity = useEntity(() => world.add({
    aiSphere: true,
    tension: initialTension,
    platterRotation: 0,
    glitchIntensity: 0,
    atmosphereShift: 0,
    rotationSpeed: 0.5,
    cloudDensity: 2.5,
    glowIntensity: 1.5,
    crackLevel: 0,
    exploded: false,
  }));

  const tension = entity.tension;
  const { currentLevel, coherence, advanceLevel, addCoherence } = useLevelStore();

  const outerSphereRef = useRef<BABYLON.Mesh>(null);
  const innerSphereRef = useRef<BABYLON.Mesh>(null);

  const glassMatRef = useRef<BABYLON.PBRMaterial>(null);
  const innerMatRef = useRef<BABYLON.ShaderMaterial>(null);

  // Restart ritual
  const restartRitual = () => {
    useLevelStore.getState().reset();
    useSeedStore.getState().generateNewSeed();
    // Visual ritual on sphere
    if (outerSphereRef.current) {
      gsap.to(outerSphereRef.current.scaling, { x: 0.6, y: 0.6, z: 0.6, duration: 0.4, yoyo: true, repeat: 3 });
    }
  };

  useBeforeRender(() => {
    const t = scene.getEngine().getDeltaTime() / 1000 + Date.now() / 1000;
    const cur = entity.tension;

    // Update inner shader
    if (innerMatRef.current) {
      innerMatRef.current.setFloat("u_time", t);
      innerMatRef.current.setFloat("u_cloud_density", 2.5 + cur * 3.5);
      innerMatRef.current.setFloat("u_glow_intensity", 1.5 + cur * 2.5);
    }

    // Glass degradation
    if (glassMatRef.current) {
      glassMatRef.current.roughness = 0.02 + cur * 0.45;
      glassMatRef.current.clearCoat = 1.0 - cur * 0.75;
    }

    // Sphere jitter
    if (outerSphereRef.current) {
      outerSphereRef.current.position.x = Math.sin(t * 14) * cur * 0.06;
      outerSphereRef.current.position.z = Math.cos(t * 17) * cur * 0.04;
    }

    // Win condition
    if (coherence >= 100 && !entity.exploded) {
      // Win ritual - sphere stabilizes, calm blue pulse
      if (innerMatRef.current) {
        innerMatRef.current.setFloat("u_glow_intensity", 4.0);
      }
      // Trigger win screen
    }

    // Max tension shatter
    if (cur >= 0.99 && !entity.exploded) {
      entity.exploded = true;
      const shatter = new BABYLON.ParticleSystem("shatter", 1800, scene);
      shatter.emitter = outerSphereRef.current;
      shatter.minSize = 0.015;
      shatter.maxSize = 0.12;
      shatter.color1 = new BABYLON.Color4(0.9, 0.3, 0.3, 1);
      shatter.color2 = new BABYLON.Color4(1.0, 0.6, 0.4, 1);
      shatter.emitRate = 1400;
      shatter.minLifeTime = 0.8;
      shatter.maxLifeTime = 3.5;
      shatter.direction1 = new BABYLON.Vector3(-10, 5, -10);
      shatter.direction2 = new BABYLON.Vector3(10, 15, 10);
      shatter.gravity = new BABYLON.Vector3(0, -18, 0);
      shatter.start();
      shatter.targetStopDuration = 3.0;

      outerSphereRef.current?.dispose();
      innerSphereRef.current?.dispose();

      // Trigger game over
      const event = new Event('gameOver');
      window.dispatchEvent(event);
    }
  });

  return (
    <Engine antialias alpha={true}>
      <Scene clearColor={new BABYLON.Color4(0,0,0,0)}>
        <TransformNode name="platterRoot" rotationY={entity.platterRotation}>
          <Cylinder name="platter" height={3.2} diameter={1.05} tessellation={64} positionY={-1.6}>
            <StandardMaterial diffuseColor={new BABYLON.Color3(0.12,0.12,0.15)} specularPower={128} />
          </Cylinder>

          <Cylinder name="track" height={0.25} diameter={0.78} tessellation={64} positionY={0.4}>
            <StandardMaterial diffuseColor={new BABYLON.Color3(0.07,0.07,0.09)} />
          </Cylinder>

          <Sphere ref={outerSphereRef} name="aiSphere" diameter={0.52} positionY={0.4}>
            <PBRMaterial
              ref={glassMatRef}
              albedoColor={new BABYLON.Color3(0.02,0.04,0.09)}
              roughness={0.02}
              metallic={0.05}
              clearCoat={1.0}
              clearCoatRoughness={0.12}
              ior={1.52}
              reflectivityColor={new BABYLON.Color3(0.92,0.96,1.0)}
            />

            <Sphere ref={innerSphereRef} name="innerOrb" diameter={0.49} positionY={0}>
              <ShaderMaterial
                ref={innerMatRef}
                uniforms={{
                  u_time: 0,
                  u_color1: new BABYLON.Color3(0.03,0.4,1.0),
                  u_color2: new BABYLON.Color3(0.1,0.8,1.0),
                  u_cloud_density: 2.5,
                  u_glow_intensity: 1.5,
                }}
                vertexSource={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
                fragmentSource={`/* Your full celestial shader here */`}
              />
            </Sphere>
          </Sphere>

          <KeyboardPlatter tension={tension} />
        </TransformNode>
      </Scene>
    </Engine>
  );
}