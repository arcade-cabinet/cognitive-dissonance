// components/platter.tsx
"use client"

import React, { useRef, useEffect } from 'react';
import { TransformNode, Cylinder, Box, Sphere, useBeforeRender, useScene } from 'reactylon';
import * as BABYLON from 'babylonjs';
import { gsap } from 'gsap';
import { useSeedStore } from '@/store/seed-store';

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

  // RGB rim lights
  const rimLightsRef = useRef<BABYLON.PointLight[]>([]);

  // Emerge Play/Continue after title sizzle
  useEffect(() => {
    setTimeout(() => {
      // Play key (left)
      if (playTopRef.current && playBottomRef.current) {
        gsap.to(playTopRef.current.position, { y: 0.048, duration: 1.4, ease: "power3.out" });
        gsap.to(playBottomRef.current.position, { y: -0.048, duration: 1.4, ease: "power3.out" });
      }
      // Continue key (right)
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
      {/* Heavy Black Metal Platter Base */}
      <Cylinder 
        name="platterBase" 
        height={0.32} 
        diameter={1.05} 
        tessellation={64}
      >
        <StandardMaterial 
          diffuseColor={new BABYLON.Color3(0.08, 0.08, 0.10)} 
          specularPower={180}
          metallic={0.95}
        />
      </Cylinder>

      {/* Thick Industrial Rim */}
      <Cylinder 
        name="rim" 
        height={0.18} 
        diameter={1.12} 
        tessellation={64}
        positionY={0.08}
      >
        <StandardMaterial 
          diffuseColor={new BABYLON.Color3(0.06, 0.06, 0.08)} 
          specularPower={200}
          emissiveColor={new BABYLON.Color3(0.1, 0.3, 0.6)}
          emissiveIntensity={0.4}
        />
      </Cylinder>

      {/* Recessed Circular Track for Glass Sphere */}
      <Cylinder 
        name="track" 
        height={0.25} 
        diameter={0.78} 
        tessellation={64}
        positionY={0.4}
      >
        <StandardMaterial diffuseColor={new BABYLON.Color3(0.07, 0.07, 0.09)} />
      </Cylinder>

      {/* Play Key (left side) - Garage Door Emergence */}
      <TransformNode position={new BABYLON.Vector3(-0.58, 0, -0.35)} rotationY={-1.05}>
        <Box name="playBody" width={0.11} height={0.08} depth={0.11}>
          <StandardMaterial diffuseColor={new BABYLON.Color3(0.18, 0.18, 0.22)} />
        </Box>
        <Box ref={playTopRef} name="playTop" width={0.11} height={0.038} depth={0.11} positionY={0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.2, 1.0, 0.4)} />
        </Box>
        <Box ref={playBottomRef} name="playBottom" width={0.11} height={0.038} depth={0.11} positionY={-0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.2, 1.0, 0.4)} />
        </Box>
        <Box 
          name="playKeycap" 
          width={0.09} 
          height={0.06} 
          depth={0.09} 
          positionY={0.05}
          onPointerDown={onPlayPress}
        >
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.2, 1.0, 0.4)} />
        </Box>
      </TransformNode>

      {/* Continue Key (right side) - Garage Door Emergence */}
      <TransformNode position={new BABYLON.Vector3(0.58, 0, -0.35)} rotationY={1.05}>
        <Box name="continueBody" width={0.11} height={0.08} depth={0.11}>
          <StandardMaterial diffuseColor={new BABYLON.Color3(0.18, 0.18, 0.22)} />
        </Box>
        <Box ref={continueTopRef} name="continueTop" width={0.11} height={0.038} depth={0.11} positionY={0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.3, 0.7, 1.0)} />
        </Box>
        <Box ref={continueBottomRef} name="continueBottom" width={0.11} height={0.038} depth={0.11} positionY={-0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.3, 0.7, 1.0)} />
        </Box>
        <Box 
          name="continueKeycap" 
          width={0.09} 
          height={0.06} 
          depth={0.09} 
          positionY={0.05}
          onPointerDown={onContinuePress}
        >
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.3, 0.7, 1.0)} />
        </Box>
      </TransformNode>

      {/* Center Pause Key */}
      <TransformNode position={new BABYLON.Vector3(0, 0, -0.35)}>
        <Box name="pauseKey" width={0.11} height={0.08} depth={0.11} onPointerDown={onPausePress}>
          <StandardMaterial 
            diffuseColor={new BABYLON.Color3(0.9, 0.4, 0.1)} 
            emissiveColor={new BABYLON.Color3(0.9, 0.4, 0.1).scale(tension * 0.6 + 0.4)} 
          />
        </Box>
      </TransformNode>

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