/**
 * 3D Room Background - Vibrant Diorama Style
 *
 * A late-night room inspired by the original 2D game's neon-arcade aesthetic.
 * Dark foundation with vivid colorful accents: huge monitor glow that shifts
 * from cool cyan to angry red with panic, bright moon, colorful clutter.
 *
 * The atmosphere comes from CONTRAST — dark walls + saturated colored lights.
 * Progressive clutter builds with each wave (energy drinks, books, extra monitor).
 *
 * All colors sourced from design tokens (src/design/tokens.ts).
 */

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { colors } from '../../design/tokens';

const sc = colors.scene;

interface RoomBackgroundProps {
  panic: number;
  wave: number;
}

export function RoomBackground({ panic, wave }: RoomBackgroundProps) {
  const w = Math.min(wave, 4);
  const monitorGlowRef = useRef<THREE.PointLight>(null);
  const monitorGlow2Ref = useRef<THREE.PointLight>(null);
  const bgMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const screenMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    // Dynamic monitor glow — shifts from cool cyan to angry red-orange with panic
    // Inspired by original 2D: radial gradient from (W/2, 560) with screen blend
    const gR = Math.min(1, (80 + panic * 2.5 + w * 10) / 255);
    const gG = Math.max(0.08, (180 - panic * 2 - w * 8) / 255);
    const gB = Math.max(0.15, (220 - panic) / 255);

    if (monitorGlowRef.current) {
      monitorGlowRef.current.color.setRGB(gR, gG, gB);
      monitorGlowRef.current.intensity = 6 + panic * 0.08;
    }
    if (monitorGlow2Ref.current) {
      monitorGlow2Ref.current.color.setRGB(gR, gG, gB);
      monitorGlow2Ref.current.intensity = 3 + panic * 0.04;
    }

    // Screen emissive plane tracks monitor glow color
    if (screenMatRef.current) {
      screenMatRef.current.emissive.setRGB(gR * 0.6, gG * 0.6, gB * 0.6);
      screenMatRef.current.emissiveIntensity = 0.8 + panic * 0.005;
    }

    // Wall color shifts with panic — from cool indigo to warm purple-red
    if (bgMatRef.current) {
      const r = Math.min(70, 28 + panic * 0.45 + w * 3) / 255;
      const g = Math.max(12, 28 - panic * 0.18) / 255;
      const b = Math.min(85, 66 + panic * 0.15) / 255;
      bgMatRef.current.color.setRGB(r, g, b);
    }
  });

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial ref={bgMatRef} color={sc.wall} />
      </mesh>

      {/* Floor */}
      <mesh position={[0, -2.5, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 4]} />
        <meshStandardMaterial color={sc.floor} />
      </mesh>

      {/* Window */}
      <group position={[-2.6, 0.8, -2.8]}>
        <mesh>
          <planeGeometry args={[2.1, 2.6]} />
          <meshBasicMaterial color={sc.windowPane} />
        </mesh>
        {/* Window frame bars */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.03, 2.6, 0.04]} />
          <meshStandardMaterial color={sc.windowFrame} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[2.1, 0.03, 0.04]} />
          <meshStandardMaterial color={sc.windowFrame} />
        </mesh>
        {/* Frame edges */}
        <mesh position={[0, 1.32, 0.02]}>
          <boxGeometry args={[2.3, 0.08, 0.05]} />
          <meshStandardMaterial color={sc.windowFrame} />
        </mesh>
        <mesh position={[0, -1.32, 0.02]}>
          <boxGeometry args={[2.3, 0.08, 0.05]} />
          <meshStandardMaterial color={sc.windowFrame} />
        </mesh>
        <mesh position={[-1.1, 0, 0.02]}>
          <boxGeometry args={[0.08, 2.7, 0.05]} />
          <meshStandardMaterial color={sc.windowFrame} />
        </mesh>
        <mesh position={[1.1, 0, 0.02]}>
          <boxGeometry args={[0.08, 2.7, 0.05]} />
          <meshStandardMaterial color={sc.windowFrame} />
        </mesh>
      </group>

      {/* Moon crescent — bright and glowing */}
      <group position={[-2.0, 1.8, -2.75]}>
        <mesh>
          <circleGeometry args={[0.28, 32]} />
          <meshBasicMaterial color={sc.moonColor} />
        </mesh>
        <mesh position={[0.12, 0.08, 0.01]}>
          <circleGeometry args={[0.24, 32]} />
          <meshBasicMaterial color={sc.windowPane} />
        </mesh>
        {/* Moon glow — warm golden light spilling into room */}
        <pointLight
          position={[0, 0, 0.2]}
          intensity={1.5}
          distance={4}
          decay={2}
          color={sc.moonGlow}
        />
      </group>

      {/* Desk */}
      <mesh position={[0, -2.0, -0.5]}>
        <boxGeometry args={[8, 0.1, 2.5]} />
        <meshStandardMaterial color={sc.desk} roughness={0.7} />
      </mesh>
      {/* Desk front edge — slightly brighter to catch light */}
      <mesh position={[0, -1.94, -0.3]}>
        <boxGeometry args={[8, 0.02, 0.02]} />
        <meshStandardMaterial color={sc.deskEdge} />
      </mesh>

      {/* Monitor screen — emissive plane representing the glowing screen */}
      <mesh position={[0, -0.8, -1.8]}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshStandardMaterial
          ref={screenMatRef}
          color="#111122"
          emissive={sc.screenSpill}
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Monitor frame */}
      <mesh position={[0, -0.8, -1.82]}>
        <boxGeometry args={[1.9, 1.3, 0.04]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, -1.5, -1.8]}>
        <boxGeometry args={[0.2, 0.3, 0.05]} />
        <meshStandardMaterial color={sc.keyboard} />
      </mesh>

      {/* Keyboard */}
      <mesh position={[-0.2, -1.9, 0.1]}>
        <boxGeometry args={[1.6, 0.04, 0.18]} />
        <meshStandardMaterial color={sc.keyboard} roughness={0.8} />
      </mesh>
      {/* Mouse */}
      <mesh position={[1.45, -1.9, 0.1]}>
        <boxGeometry args={[0.22, 0.03, 0.24]} />
        <meshStandardMaterial color={sc.mouse} roughness={0.6} />
      </mesh>

      {/* Coffee mug — warm brown with dark liquid */}
      <group position={[2.0, -1.85, 0.2]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.07, 0.18, 12]} />
          <meshStandardMaterial color="#2c3e50" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.02, 12]} />
          <meshStandardMaterial color="#1a252f" />
        </mesh>
      </group>

      {/* === LIGHTING — vivid colored lights for arcade feel === */}

      {/* Primary monitor glow — the huge colored light that bathes the scene */}
      <pointLight
        ref={monitorGlowRef}
        position={[0, -1.2, 0.5]}
        intensity={6}
        distance={14}
        decay={1.2}
        color={sc.monitorGlow}
      />

      {/* Secondary monitor glow — wider fill from screen */}
      <pointLight
        ref={monitorGlow2Ref}
        position={[0, -0.5, -1]}
        intensity={3}
        distance={10}
        decay={1.5}
        color={sc.monitorGlow}
      />

      {/* Ambient — moderate to preserve color saturation */}
      <ambientLight intensity={0.5} color={sc.ambient} />

      {/* Front fill — illuminates character face and body clearly */}
      <directionalLight position={[0, 2, 5]} intensity={0.9} color={sc.fillLight} />

      {/* Key light from above-right — defines shapes */}
      <directionalLight position={[1.5, 4, 2]} intensity={0.6} color={sc.keyLight} />

      {/* Rim light from behind — separates objects from background */}
      <pointLight
        position={[0, 1.5, -2.5]}
        intensity={2}
        distance={8}
        decay={2}
        color={sc.rimLight}
      />

      {/* Warm desk lamp accent — adds warmth to desk area */}
      <pointLight
        position={[-2.5, -1.2, 0.5]}
        intensity={1}
        distance={4}
        decay={2}
        color={sc.deskLamp}
      />

      {/* Posters — bright, clearly readable */}
      <group position={[-0.6, 1.2, -2.9]}>
        <mesh>
          <planeGeometry args={[1.0, 0.7]} />
          <meshStandardMaterial color={sc.poster} emissive={sc.poster} emissiveIntensity={0.1} />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.09}
          color={sc.posterText}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
        >
          {w < 3 ? 'AGI\nSOON' : 'AGI IS\nHERE'}
        </Text>
      </group>

      {w >= 1 && (
        <group position={[1.6, 1.0, -2.9]}>
          <mesh>
            <planeGeometry args={[0.85, 0.65]} />
            <meshStandardMaterial color={sc.poster} emissive={sc.poster} emissiveIntensity={0.1} />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.09}
            color={sc.posterText}
            anchorX="center"
            anchorY="middle"
            textAlign="center"
          >
            {w < 3 ? 'BUY\nGPU' : 'SELL\nHOUSE'}
          </Text>
        </group>
      )}

      {/* Progressive clutter: energy drinks — bright green with glow */}
      {w >= 1 && (
        <group position={[-1.3, -1.8, 0.2]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.28, 8]} />
            <meshStandardMaterial
              color={colors.semantic.success}
              emissive={colors.semantic.success}
              emissiveIntensity={0.5}
            />
          </mesh>
          <pointLight
            position={[0, 0.1, 0]}
            intensity={0.3}
            distance={0.8}
            decay={2}
            color={colors.semantic.success}
          />
        </group>
      )}
      {w >= 2 && (
        <>
          <mesh position={[-1.15, -1.8, 0.3]}>
            <cylinderGeometry args={[0.04, 0.04, 0.26, 8]} />
            <meshStandardMaterial
              color={colors.semantic.success}
              emissive={colors.semantic.success}
              emissiveIntensity={0.5}
            />
          </mesh>
          <mesh position={[-0.95, -1.8, 0.15]}>
            <cylinderGeometry args={[0.04, 0.04, 0.24, 8]} />
            <meshStandardMaterial
              color={colors.accent.reality}
              emissive={colors.accent.reality}
              emissiveIntensity={0.4}
            />
          </mesh>
          {/* Books — warm visible brown tones */}
          <mesh position={[-1.8, -1.88, -0.2]}>
            <boxGeometry args={[0.7, 0.06, 0.18]} />
            <meshStandardMaterial color="#7a5838" roughness={0.8} />
          </mesh>
          <mesh position={[-1.8, -1.83, -0.2]}>
            <boxGeometry args={[0.65, 0.05, 0.16]} />
            <meshStandardMaterial color="#8b6642" roughness={0.8} />
          </mesh>
        </>
      )}
      {w >= 3 && (
        <>
          {/* Second monitor — vivid blue glow */}
          <group position={[2.0, -0.7, -1.5]}>
            <mesh>
              <boxGeometry args={[1.0, 0.7, 0.05]} />
              <meshStandardMaterial
                color="#111122"
                emissive={colors.semantic.info}
                emissiveIntensity={0.6}
              />
            </mesh>
            <mesh position={[0, -0.45, 0]}>
              <boxGeometry args={[0.2, 0.2, 0.05]} />
              <meshStandardMaterial color={sc.keyboard} />
            </mesh>
            <pointLight
              position={[0, 0, 0.5]}
              intensity={1.5}
              distance={3}
              decay={2}
              color={colors.semantic.info}
            />
          </group>

          {/* Sticky note — vivid Psyduck yellow */}
          <group position={[0.8, 1.3, -2.85]}>
            <mesh>
              <planeGeometry args={[0.4, 0.36]} />
              <meshStandardMaterial
                color={colors.primary.main}
                emissive={colors.primary.main}
                emissiveIntensity={0.3}
              />
            </mesh>
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.06}
              color="#333333"
              anchorX="center"
              anchorY="middle"
              textAlign="center"
            >
              {'HELP\nME'}
            </Text>
          </group>
        </>
      )}
      {w >= 4 && (
        <>
          {/* Scattered papers — signs of chaos */}
          <mesh position={[1.0, -1.88, 0.4]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <planeGeometry args={[0.3, 0.22]} />
            <meshStandardMaterial color="#ddd" transparent opacity={0.15} />
          </mesh>
          <mesh position={[0.8, -1.88, 0.5]} rotation={[-Math.PI / 2, 0, -0.2]}>
            <planeGeometry args={[0.25, 0.18]} />
            <meshStandardMaterial color="#ddd" transparent opacity={0.12} />
          </mesh>
        </>
      )}

      {/* Stars in window */}
      <WindowStars />
    </group>
  );
}

function WindowStars() {
  const groupRef = useRef<THREE.Group>(null);
  const starsData = useRef(
    Array.from({ length: 50 }, () => ({
      x: -2.6 + (Math.random() - 0.5) * 1.8,
      y: 0.8 + (Math.random() - 0.5) * 2.2,
      size: Math.random() * 0.015 + 0.005,
      speed: Math.random() * 2 + 1,
      phase: Math.random() * Math.PI * 2,
    }))
  ).current;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const star = starsData[i];
      if (star) {
        (child as THREE.Mesh).scale.setScalar(0.6 + Math.sin(t * star.speed + star.phase) * 0.4);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {starsData.map((star) => (
        <mesh key={`star-${star.x}-${star.y}`} position={[star.x, star.y, -2.79]}>
          <planeGeometry args={[star.size, star.size]} />
          <meshBasicMaterial color={colors.ui.text.primary} />
        </mesh>
      ))}
    </group>
  );
}
