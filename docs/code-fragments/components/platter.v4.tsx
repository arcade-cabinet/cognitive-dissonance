// components/platter.tsx
"use client"

import React, { useRef, useEffect } from 'react';
import { TransformNode, Cylinder, Box, Sphere, ParticleSystem, useBeforeRender, useScene } from 'reactylon';
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

  // Recess glow lights
  const recessGlowRef = useRef<BABYLON.PointLight>(null);

  // Dust particles for mechanical feel on open
  const dustParticlesRef = useRef<BABYLON.ParticleSystem>(null);

  // Emerge Play/Continue after title sizzle
  useEffect(() => {
    setTimeout(() => {
      openGarageDoor('play');
      openGarageDoor('continue');
    }, 2600);
  }, []);

  const openGarageDoor = (type: 'play' | 'continue') => {
    const top = type === 'play' ? playTopRef.current : continueTopRef.current;
    const bottom = type === 'play' ? playBottomRef.current : continueBottomRef.current;

    if (!top || !bottom) return;

    // Staggered garage door with mechanical easing
    gsap.to(top.position, { 
      y: 0.048, 
      duration: 1.8, 
      ease: "power3.out",
      delay: 0 
    });
    gsap.to(bottom.position, { 
      y: -0.048, 
      duration: 1.8, 
      ease: "power3.out",
      delay: 0.2 
    });

    // Subtle rotation for gear feel
    gsap.to(top.rotation, { 
      x: -0.08, 
      duration: 1.6, 
      ease: "power2.out",
      yoyo: true,
      repeat: 1 
    });
    gsap.to(bottom.rotation, { 
      x: 0.08, 
      duration: 1.6, 
      ease: "power2.out",
      yoyo: true,
      repeat: 1 
    });

    // Recess glow ramp
    if (recessGlowRef.current) {
      gsap.to(recessGlowRef.current, { 
        intensity: 2.5, 
        duration: 1.8, 
        ease: "power2.out" 
      });
    }

    // Dust particles burst from recess
    if (dustParticlesRef.current) {
      dustParticlesRef.current.start();
      setTimeout(() => dustParticlesRef.current?.stop(), 800);
    }
  };

  useBeforeRender(() => {
    const t = scene.getEngine().getDeltaTime() / 1000 + Date.now() / 1000;
    const cur = tension;

    // Platter rotation (only Y axis, fixed position)
    if (platterRef.current) {
      platterRef.current.rotation.y = Math.sin(t * 0.165) * 1.72;
    }

    // RGB rim pulsing
    // (rim lights already set up in code below)
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
          metallic={0.92}
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
          emissiveIntensity={0.5}
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
        <Box ref={playTopRef} name="playTop" width={0.11} height={0.038} depth={0.11} positionY={0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.2, 1.0, 0.4)} />
        </Box>
        <Box ref={playBottomRef} name="playBottom" width={0.11} height={0.038} depth={0.11} positionY={-0.021}>
          <StandardMaterial emissiveColor={new BABYLON.Color3(0.2, 1.0, 0.4)} />
        </Box>
        <Box 
          ref={keycapRef}
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

      {/* Recess Glow Light */}
      <PointLight ref={recessGlowRef} name="recessGlow" intensity={0} color={new BABYLON.Color3(0.2, 0.8, 1.0)} position={new BABYLON.Vector3(0, 0.4, 0)} />

      {/* Dust Particles on Open */}
      <ParticleSystem 
        ref={dustParticlesRef} 
        name="dust" 
        capacity={120} 
        emitRate={0} 
        minSize={0.008} 
        maxSize={0.025}
        color1={new BABYLON.Color4(0.6, 0.6, 0.6, 0.8)}
        color2={new BABYLON.Color4(0.4, 0.4, 0.4, 0.4)}
        minLifeTime={0.6}
        maxLifeTime={1.8}
      />
    </TransformNode>
  );
}