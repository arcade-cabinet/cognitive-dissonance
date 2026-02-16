/**
 * 3D Room Background - Bright Diorama style
 *
 * A vivid late-night room with strong lighting so everything is clearly visible.
 * Bright monitor glow, generous ambient + fill lights. The atmosphere comes
 * from color shifts and visual storytelling, not darkness.
 * Progressive clutter builds with each wave (energy drinks, books, extra monitor).
 */

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';

interface RoomBackgroundProps {
  panic: number;
  wave: number;
}

export function RoomBackground({ panic, wave }: RoomBackgroundProps) {
  const w = Math.min(wave, 4);
  const monitorGlowRef = useRef<THREE.PointLight>(null);
  const bgMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    if (monitorGlowRef.current) {
      // Bright monitor glow that shifts color with panic
      const r = Math.min(1, (120 + panic * 2 + w * 10) / 255);
      const g = Math.max(0.2, (200 - panic * 1.5 - w * 5) / 255);
      const b = Math.max(0.3, (240 - panic * 0.8) / 255);
      monitorGlowRef.current.color.setRGB(r, g, b);
      monitorGlowRef.current.intensity = 5 + panic * 0.05;
    }
    if (bgMatRef.current) {
      // Wall color shifts subtly with panic — visible, not black
      const r = Math.min(60, 25 + panic * 0.4 + w * 3) / 255;
      const g = Math.max(15, 30 - panic * 0.15) / 255;
      const b = Math.min(80, 55 + panic * 0.2) / 255;
      bgMatRef.current.color.setRGB(r, g, b);
    }
  });

  return (
    <group>
      {/* Back wall — visible dark blue, not black */}
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial ref={bgMatRef} color="#1a1a38" />
      </mesh>

      {/* Floor — visible dark tone */}
      <mesh position={[0, -2.5, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 4]} />
        <meshStandardMaterial color="#1a1a30" />
      </mesh>

      {/* Window */}
      <group position={[-2.6, 0.8, -2.8]}>
        <mesh>
          <planeGeometry args={[2.1, 2.6]} />
          <meshBasicMaterial color="#080828" />
        </mesh>
        {/* Window frame bars */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.03, 2.6, 0.04]} />
          <meshStandardMaterial color="#3a4a5c" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[2.1, 0.03, 0.04]} />
          <meshStandardMaterial color="#3a4a5c" />
        </mesh>
        {/* Frame edges */}
        <mesh position={[0, 1.32, 0.02]}>
          <boxGeometry args={[2.3, 0.08, 0.05]} />
          <meshStandardMaterial color="#3a4a5c" />
        </mesh>
        <mesh position={[0, -1.32, 0.02]}>
          <boxGeometry args={[2.3, 0.08, 0.05]} />
          <meshStandardMaterial color="#3a4a5c" />
        </mesh>
        <mesh position={[-1.1, 0, 0.02]}>
          <boxGeometry args={[0.08, 2.7, 0.05]} />
          <meshStandardMaterial color="#3a4a5c" />
        </mesh>
        <mesh position={[1.1, 0, 0.02]}>
          <boxGeometry args={[0.08, 2.7, 0.05]} />
          <meshStandardMaterial color="#3a4a5c" />
        </mesh>
      </group>

      {/* Moon crescent — bright and glowing */}
      <group position={[-2.0, 1.8, -2.75]}>
        <mesh>
          <circleGeometry args={[0.28, 32]} />
          <meshBasicMaterial color="#fffde8" />
        </mesh>
        <mesh position={[0.12, 0.08, 0.01]}>
          <circleGeometry args={[0.24, 32]} />
          <meshBasicMaterial color="#080828" />
        </mesh>
        {/* Moon glow */}
        <pointLight position={[0, 0, 0.1]} intensity={1} distance={3} decay={2} color="#ffe8c0" />
      </group>

      {/* Desk */}
      <mesh position={[0, -2.0, -0.5]}>
        <boxGeometry args={[8, 0.1, 2.5]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0, -1.94, -0.3]}>
        <boxGeometry args={[8, 0.02, 0.02]} />
        <meshStandardMaterial color="#253545" />
      </mesh>
      {/* Keyboard */}
      <mesh position={[-0.2, -1.9, 0.1]}>
        <boxGeometry args={[1.6, 0.04, 0.18]} />
        <meshStandardMaterial color="#1a2530" />
      </mesh>
      {/* Mouse */}
      <mesh position={[1.45, -1.9, 0.1]}>
        <boxGeometry args={[0.22, 0.03, 0.24]} />
        <meshStandardMaterial color="#3d5060" />
      </mesh>

      {/* === LIGHTING — bright and clear === */}

      {/* Monitor glow — the main colored light source */}
      <pointLight
        ref={monitorGlowRef}
        position={[0, -1.2, 0.5]}
        intensity={5}
        distance={12}
        decay={1.5}
        color="#50b4dc"
      />

      {/* Strong ambient light — everything visible at all times */}
      <ambientLight intensity={0.8} color="#445577" />

      {/* Front fill light from camera — illuminates character and scene */}
      <directionalLight position={[0, 2, 5]} intensity={0.8} color="#6688aa" />

      {/* Top-down key light — defines shapes clearly */}
      <directionalLight position={[1, 4, 2]} intensity={0.5} color="#778899" />

      {/* Rim light from behind — makes objects pop from the background */}
      <pointLight position={[0, 1, -2]} intensity={1.5} distance={8} decay={2} color="#334466" />

      {/* Posters — bright, clearly readable */}
      <group position={[-0.6, 1.2, -2.9]}>
        <mesh>
          <planeGeometry args={[1.0, 0.7]} />
          <meshStandardMaterial color="#2a2a44" />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.09}
          color="#8899bb"
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
            <meshStandardMaterial color="#2a2a44" />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.09}
            color="#8899bb"
            anchorX="center"
            anchorY="middle"
            textAlign="center"
          >
            {w < 3 ? 'BUY\nGPU' : 'SELL\nHOUSE'}
          </Text>
        </group>
      )}

      {/* Progressive clutter: energy drinks — bright green */}
      {w >= 1 && (
        <mesh position={[-1.3, -1.8, 0.2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.28, 8]} />
          <meshStandardMaterial color="#2ecc71" emissive="#2ecc71" emissiveIntensity={0.3} />
        </mesh>
      )}
      {w >= 2 && (
        <>
          <mesh position={[-1.15, -1.8, 0.3]}>
            <cylinderGeometry args={[0.04, 0.04, 0.26, 8]} />
            <meshStandardMaterial color="#2ecc71" emissive="#2ecc71" emissiveIntensity={0.3} />
          </mesh>
          {/* Books — warm brown tones */}
          <mesh position={[-1.8, -1.88, -0.2]}>
            <boxGeometry args={[0.7, 0.06, 0.18]} />
            <meshStandardMaterial color="#6d4c2f" />
          </mesh>
          <mesh position={[-1.8, -1.83, -0.2]}>
            <boxGeometry args={[0.65, 0.05, 0.16]} />
            <meshStandardMaterial color="#7a5838" />
          </mesh>
        </>
      )}
      {w >= 3 && (
        <>
          {/* Second monitor — visible with glow */}
          <group position={[2.0, -0.7, -1.5]}>
            <mesh>
              <boxGeometry args={[1.0, 0.7, 0.05]} />
              <meshStandardMaterial color="#1a1a30" emissive="#2244aa" emissiveIntensity={0.4} />
            </mesh>
            <mesh position={[0, -0.45, 0]}>
              <boxGeometry args={[0.2, 0.2, 0.05]} />
              <meshStandardMaterial color="#2a2a3a" />
            </mesh>
          </group>
          {/* Sticky note — bright yellow */}
          <group position={[0.8, 1.3, -2.85]}>
            <mesh>
              <planeGeometry args={[0.4, 0.36]} />
              <meshStandardMaterial color="#f1c40f" emissive="#f1c40f" emissiveIntensity={0.2} />
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
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
    </group>
  );
}
