/**
 * 3D Room Background - Diorama style
 *
 * A moody late-night room you're peering into. Window with stars and moon,
 * desk with keyboard/mouse, posters that change with wave progression,
 * monitor glow that shifts from calm blue to panicked red.
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
      const r = Math.min(1, (80 + panic * 2.5 + w * 10) / 255);
      const g = Math.max(0.08, (180 - panic * 2 - w * 8) / 255);
      const b = Math.max(0.15, (220 - panic) / 255);
      monitorGlowRef.current.color.setRGB(r, g, b);
      monitorGlowRef.current.intensity = 2 + panic * 0.03;
    }
    if (bgMatRef.current) {
      const r = Math.min(30, 10 + panic * 0.25 + w * 2) / 255;
      const g = Math.max(5, 12 - panic * 0.08) / 255;
      const b = Math.min(40, 26 + panic * 0.1) / 255;
      bgMatRef.current.color.setRGB(r, g, b);
    }
  });

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial ref={bgMatRef} color="#0a0a18" />
      </mesh>

      {/* Floor */}
      <mesh position={[0, -2.5, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 4]} />
        <meshStandardMaterial color="#0d0d1a" />
      </mesh>

      {/* Window */}
      <group position={[-2.6, 0.8, -2.8]}>
        <mesh>
          <planeGeometry args={[2.1, 2.6]} />
          <meshBasicMaterial color="#030310" />
        </mesh>
        {/* Window frame bars */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.03, 2.6, 0.04]} />
          <meshStandardMaterial color="#1c2833" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[2.1, 0.03, 0.04]} />
          <meshStandardMaterial color="#1c2833" />
        </mesh>
        {/* Frame edges */}
        <mesh position={[0, 1.32, 0.02]}>
          <boxGeometry args={[2.3, 0.08, 0.05]} />
          <meshStandardMaterial color="#1c2833" />
        </mesh>
        <mesh position={[0, -1.32, 0.02]}>
          <boxGeometry args={[2.3, 0.08, 0.05]} />
          <meshStandardMaterial color="#1c2833" />
        </mesh>
        <mesh position={[-1.1, 0, 0.02]}>
          <boxGeometry args={[0.08, 2.7, 0.05]} />
          <meshStandardMaterial color="#1c2833" />
        </mesh>
        <mesh position={[1.1, 0, 0.02]}>
          <boxGeometry args={[0.08, 2.7, 0.05]} />
          <meshStandardMaterial color="#1c2833" />
        </mesh>
      </group>

      {/* Moon crescent */}
      <group position={[-2.0, 1.8, -2.75]}>
        <mesh>
          <circleGeometry args={[0.28, 32]} />
          <meshBasicMaterial color="#e8e8d0" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0.12, 0.08, 0.01]}>
          <circleGeometry args={[0.24, 32]} />
          <meshBasicMaterial color="#030310" />
        </mesh>
      </group>

      {/* Desk */}
      <mesh position={[0, -2.0, -0.5]}>
        <boxGeometry args={[8, 0.1, 2.5]} />
        <meshStandardMaterial color="#1c2833" />
      </mesh>
      <mesh position={[0, -1.94, -0.3]}>
        <boxGeometry args={[8, 0.02, 0.02]} />
        <meshStandardMaterial color="#17202a" />
      </mesh>
      {/* Keyboard */}
      <mesh position={[-0.2, -1.9, 0.1]}>
        <boxGeometry args={[1.6, 0.04, 0.18]} />
        <meshStandardMaterial color="#0d1117" />
      </mesh>
      {/* Mouse */}
      <mesh position={[1.45, -1.9, 0.1]}>
        <boxGeometry args={[0.22, 0.03, 0.24]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>

      {/* Monitor glow */}
      <pointLight
        ref={monitorGlowRef}
        position={[0, -1.2, 0.5]}
        intensity={2}
        distance={8}
        decay={2}
        color="#50b4dc"
      />
      <ambientLight intensity={0.3} color="#1a1a3a" />
      {/* Fill light from camera direction for scene visibility */}
      <directionalLight position={[0, 2, 4]} intensity={0.2} color="#334466" />

      {/* Posters */}
      <group position={[-0.6, 1.2, -2.9]}>
        <mesh>
          <planeGeometry args={[1.0, 0.7]} />
          <meshStandardMaterial color="#12121f" />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.09}
          color="#445566"
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
            <meshStandardMaterial color="#12121f" />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.09}
            color="#445566"
            anchorX="center"
            anchorY="middle"
            textAlign="center"
          >
            {w < 3 ? 'BUY\nGPU' : 'SELL\nHOUSE'}
          </Text>
        </group>
      )}

      {/* Progressive clutter: energy drinks */}
      {w >= 1 && (
        <mesh position={[-1.3, -1.8, 0.2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.28, 8]} />
          <meshStandardMaterial color="#1a5c2a" emissive="#2ecc71" emissiveIntensity={0.1} />
        </mesh>
      )}
      {w >= 2 && (
        <>
          <mesh position={[-1.15, -1.8, 0.3]}>
            <cylinderGeometry args={[0.04, 0.04, 0.26, 8]} />
            <meshStandardMaterial color="#1a5c2a" emissive="#2ecc71" emissiveIntensity={0.1} />
          </mesh>
          {/* Books */}
          <mesh position={[-1.8, -1.88, -0.2]}>
            <boxGeometry args={[0.7, 0.06, 0.18]} />
            <meshStandardMaterial color="#3d2b1f" />
          </mesh>
          <mesh position={[-1.8, -1.83, -0.2]}>
            <boxGeometry args={[0.65, 0.05, 0.16]} />
            <meshStandardMaterial color="#4a3728" />
          </mesh>
        </>
      )}
      {w >= 3 && (
        <>
          {/* Second monitor */}
          <group position={[2.0, -0.7, -1.5]}>
            <mesh>
              <boxGeometry args={[1.0, 0.7, 0.05]} />
              <meshStandardMaterial color="#0a0a14" emissive="#0a0a14" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, -0.45, 0]}>
              <boxGeometry args={[0.2, 0.2, 0.05]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
          </group>
          {/* Sticky note */}
          <group position={[0.8, 1.3, -2.85]}>
            <mesh>
              <planeGeometry args={[0.4, 0.36]} />
              <meshStandardMaterial color="#f1c40f" />
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
