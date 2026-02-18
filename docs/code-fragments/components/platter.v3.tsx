// components/platter.tsx
"use client"

import React, { useRef, useEffect } from 'react';
import { TransformNode, Cylinder, Box, Sphere, useBeforeRender, useScene } from 'reactylon';
import * as BABYLON from 'babylonjs';
import { gsap } from 'gsap';

interface PlatterProps {
  tension: number;
  onPlayPress: () => void;
  onContinuePress: () => void;
  onPausePress: () => void;
}

export function Platter({ tension, onPlayPress, onContinuePress, onPausePress }: PlatterProps) {
  const scene = useScene();

  const platterRef = useRef<BABYLON.TransformNode>(null);

  // Garage door refs
  const playTopRef = useRef<BABYLON.Mesh>(null);
  const playBottomRef = useRef<BABYLON.Mesh>(null);
  const continueTopRef = useRef<BABYLON.Mesh>(null);
  const continueBottomRef = useRef<BABYLON.Mesh>(null);

  // Lever refs
  const leverTopRef = useRef<BABYLON.Mesh>(null);
  const leverBottomRef = useRef<BABYLON.Mesh>(null);

  // Keycap and lever refs
  const keycapRef = useRef<BABYLON.Mesh>(null);
  const leverHandleRef = useRef<BABYLON.Mesh>(null);

  // RGB rim lights
  const rimLightsRef = useRef<BABYLON.PointLight[]>([]);

  // Emerge Play/Continue after title sizzle
  useEffect(() => {
    setTimeout(() => {
      // Play key garage-door
      if (playTopRef.current && playBottomRef.current) {
        gsap.to(playTopRef.current.position, { y: 0.048, duration: 1.4, ease: "power3.out" });
        gsap.to(playBottomRef.current.position, { y: -0.048, duration: 1.4, ease: "power3.out" });
      }
      // Continue key garage-door
      if (continueTopRef.current && continueBottomRef.current) {
        gsap.to(continueTopRef.current.position, { y: 0.048, duration: 1.4, ease: "power3.out" });
        gsap.to(continueBottomRef.current.position, { y: -0.048, duration: 1.4, ease: "power3.out" });
      }
    }, 2600);
  }, []);

  useBeforeRender(() => {
    const t = scene.getEngine().getDeltaTime() / 1000 + Date.now() / 1000;
    const cur = tension;

    // Platter rotation (only Y axis, fixed position)
    if (platterRef.current) {
      platterRef.current.rotation.y = Math.sin(t * 0.165) * 1.72;
    }

    // RGB rim pulsing
    rimLightsRef.current.forEach((light, i) => {
      const offset = (i / rimLightsRef.current.length) * Math.PI * 2;
      light.intensity = 1.2 + Math.sin(t * 3 + offset) * 0.8 * cur;
    });
  });

  return (
    <TransformNode ref={platterRef} name="platterRoot" positionY={-1.6}>
      {/* Main Platter Surface */}
      <Cylinder 
        name="platterBase" 
        height={0.3} 
        diameter={3} 
        tessellation={64}
      >
        <StandardMaterial 
          diffuseColor={new BABYLON.Color3(0.08, 0.08, 0.10)} 
          specularPower={180}
          metallic={0.92}
        />
      </Cylinder>

      {/* Machined Surface Details */}
      <Cylinder 
        name="machinedDetail" 
        height={0.002} 
        diameter={2.95} 
        tessellation={128}
        positionY={0.151}
      >
        <StandardMaterial 
          diffuseColor={new BABYLON.Color3(0.15, 0.15, 0.15)} 
          metallic={0.88}
        />
      </Cylinder>

      {/* Thick Outer Rim with RGB Lighting */}
      <Cylinder 
        name="rim" 
        height={0.18} 
        diameter={3.2} 
        tessellation={64}
        positionY={0.15}
      >
        <StandardMaterial 
          diffuseColor={new BABYLON.Color3(0.06, 0.06, 0.08)} 
          specularPower={200}
          emissiveColor={new BABYLON.Color3(0.1, 0.3, 0.6)}
          emissiveIntensity={0.5}
        />
      </Cylinder>

      {/* Inner Rim Detail */}
      <Cylinder 
        name="innerRim" 
        height={0.05} 
        diameter={2.8} 
        tessellation={64}
        positionY={0.15}
      >
        <StandardMaterial 
          diffuseColor={new BABYLON.Color3(0.1, 0.1, 0.1)} 
          metallic={0.85}
        />
      </Cylinder>

      {/* Recessed Center Track for Glass Sphere */}
      <Cylinder 
        name="track" 
        height={0.25} 
        diameter={0.78} 
        tessellation={64}
        positionY={0.4}
      >
        <StandardMaterial diffuseColor={new BABYLON.Color3(0.07, 0.07, 0.09)} />
      </Cylinder>

      {/* Track Inner Shadow */}
      <Cylinder 
        name="trackShadow" 
        height={0.03} 
        diameter={0.52} 
        tessellation={64}
        positionY={0.155}
      >
        <StandardMaterial diffuseColor={new BABYLON.Color3(0.05, 0.05, 0.05)} />
      </Cylinder>

      {/* Glass Sphere Container */}
      <Sphere name="glassSphere" diameter={0.52} positionY={0.68}>
        <PBRMaterial 
          albedoColor={new BABYLON.Color3(0.95, 0.95, 1.0)}
          metallic={0.05}
          roughness={0.02}
          transmission={0.98}
          thickness={0.8}
          ior={1.52}
          transparent={true}
          opacity={0.95}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </Sphere>

      {/* Nebula Shader Effect Inside Sphere */}
      <Sphere name="innerNebula" diameter={0.50} positionY={0.68}>
        <ShaderMaterial 
          vertexSource={`varying vec2 vUv; varying vec3 vPosition; void main() { vUv = uv; vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
          fragmentSource={`/* Your full celestial shader from the variant */`}
        />
      </Sphere>

      {/* Garage Door for Key (left side) */}
      <TransformNode position={new BABYLON.Vector3(-0.58, 0, -0.35)} rotationY={-1.05}>
        <Box ref={playTopRef} name="playTop" width={0.11} height={0.038} depth={0.11} positionY={0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.2, 1.0, 0.4)} />
        </Box>
        <Box ref={playBottomRef} name="playBottom" width={0.11} height={0.038} depth={0.11} positionY={-0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.2, 1.0, 0.4)} />
        </Box>
      </TransformNode>

      {/* Garage Door for Lever (right side) */}
      <TransformNode position={new BABYLON.Vector3(0.58, 0, -0.35)} rotationY={1.05}>
        <Box ref={continueTopRef} name="continueTop" width={0.11} height={0.038} depth={0.11} positionY={0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.3, 0.7, 1.0)} />
        </Box>
        <Box ref={continueBottomRef} name="continueBottom" width={0.11} height={0.038} depth={0.11} positionY={-0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.3, 0.7, 1.0)} />
        </Box>
      </TransformNode>

      {/* Mechanical Key */}
      <Box name="keycap" width={0.09} height={0.06} depth={0.09} positionY={0.05} onPointerDown={onPlayPress}>
        <StandardMaterial emissiveColor={new BABYLON.Color3(0.2, 1.0, 0.4)} />
      </Box>

      {/* Lever Switch */}
      <Box name="lever" width={0.04} height={0.15} depth={0.04} positionY={0.05} onPointerDown={onContinuePress}>
        <StandardMaterial emissiveColor={new BABYLON.Color3(0.3, 0.7, 1.0)} />
      </Box>

      {/* 6 decorative keys left + 6 right with dynamic RGB */}
      {Array.from({ length: 12 }, (_, i) => {
        const side = i < 6 ? -1 : 1;
        const idx = i < 6 ? i : i - 6;
        const angle = side * (0.4 + idx * 0.18);
        return (
          <TransformNode key={i} position={new BABYLON.Vector3(Math.sin(angle) * 0.58, 0, Math.cos(angle) * 0.58 - 0.35)} rotationY={angle}>
            <Box name={`decorKey${i}`} width={0.09} height={0.06} depth={0.09}>
              <StandardMaterial 
                diffuseColor={new BABYLON.Color3(0.22, 0.22, 0.26)}
                emissiveColor={new BABYLON.Color3(0.4, 0.7, 1.0).scale(tension * 0.8 + 0.2)}
              />
            </Box>
          </TransformNode>
        );
      })}
    </TransformNode>
  );
}