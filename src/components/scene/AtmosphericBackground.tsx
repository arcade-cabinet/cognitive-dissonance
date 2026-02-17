/**
 * Atmospheric Background — Dark Void with Dramatic Lighting
 *
 * Replaces the detailed room diorama with a focused atmospheric environment.
 * The bust composition doesn't need room geometry — just:
 * - Monitor glow from in front (primary fill light, shifts with panic)
 * - Rim light from behind (defines head/shoulder silhouette)
 * - Keyboard RGB glow (from the KeyboardControls component)
 * - Ambient darkness with floating dust particles
 *
 * Inspired by the Aceternity spotlight pattern — soft elliptical bloom
 * creating dramatic depth with minimal geometry.
 */

import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { colors } from '../../design/tokens';

const sc = colors.scene;

interface AtmosphericBackgroundProps {
  panicRef: React.RefObject<number>;
}

export function AtmosphericBackground({ panicRef }: AtmosphericBackgroundProps) {
  const monitorGlowRef = useRef<THREE.PointLight>(null);
  const rimLightRef = useRef<THREE.PointLight>(null);
  const screenPlaneRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const panic = panicRef.current ?? 0;

    // ── Monitor glow — shifts from cool cyan to warm red-orange ──
    // This is the primary light source, as if a screen is in front of the character
    const gR = Math.min(1, (80 + panic * 2.5) / 255);
    const gG = Math.max(0.08, (180 - panic * 2) / 255);
    const gB = Math.max(0.15, (220 - panic) / 255);

    if (monitorGlowRef.current) {
      monitorGlowRef.current.color.setRGB(gR, gG, gB);
      monitorGlowRef.current.intensity = 5 + panic * 0.06;
    }

    // ── Rim light intensity increases slightly with panic ──
    if (rimLightRef.current) {
      rimLightRef.current.intensity = 2 + panic * 0.02;
    }

    // ── Screen glow plane tracks monitor color ──
    if (screenPlaneRef.current) {
      screenPlaneRef.current.emissive.setRGB(gR * 0.4, gG * 0.4, gB * 0.4);
      screenPlaneRef.current.emissiveIntensity = 0.6 + panic * 0.004;
    }
  });

  return (
    <group>
      {/* ── BACKGROUND VOID ── */}
      {/* Dark backdrop — just enough to frame the bust */}
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[20, 14]} />
        <meshBasicMaterial color="#0a0a18" />
      </mesh>

      {/* ── SCREEN GLOW PLANE ── */}
      {/* Soft, diffuse glow suggesting a monitor in front of the character */}
      <mesh position={[0, -0.5, 2]} rotation={[0.15, Math.PI, 0]}>
        <planeGeometry args={[3, 2]} />
        <meshStandardMaterial
          ref={screenPlaneRef}
          color="#050510"
          emissive={sc.screenSpill}
          emissiveIntensity={0.6}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* ── LIGHTING ── */}

      {/* Primary monitor glow — from in front, illuminates keyboard and chin/shoulders */}
      <pointLight
        ref={monitorGlowRef}
        position={[0, -0.8, 3]}
        intensity={5}
        distance={12}
        decay={1.2}
        color={sc.monitorGlow}
      />

      {/* Rim light — from behind/above, defines silhouette */}
      <pointLight
        ref={rimLightRef}
        position={[0, 2, -3]}
        intensity={2}
        distance={8}
        decay={2}
        color={sc.rimLight}
      />

      {/* Ambient — very low, deep blue-purple */}
      <ambientLight intensity={0.25} color="#1a1a3a" />

      {/* Subtle side fill — faint warm accent from one side */}
      <pointLight
        position={[-3, 0, 0]}
        intensity={0.5}
        distance={6}
        decay={2}
        color={sc.deskLamp}
      />

      {/* ── FLOATING DUST PARTICLES ── */}
      {/* Tiny particles visible in the monitor light — atmospheric depth */}
      <DustMotes />
    </group>
  );
}

// ─── Dust Motes ───────────────────────────────────────────────

function DustMotes() {
  const groupRef = useRef<THREE.Group>(null);

  const motes = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 3,
        z: (Math.random() - 0.5) * 3,
        speed: 0.1 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        size: 0.005 + Math.random() * 0.008,
        key: `mote-${i}`,
      })),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    groupRef.current.children.forEach((child, i) => {
      const mote = motes[i];
      if (!mote) return;
      const mesh = child as THREE.Mesh;

      // Gentle floating motion
      mesh.position.set(
        mote.x + Math.sin(t * mote.speed + mote.phase) * 0.3,
        mote.y + Math.sin(t * mote.speed * 0.7 + mote.phase * 1.5) * 0.2,
        mote.z + Math.cos(t * mote.speed * 0.5 + mote.phase) * 0.2
      );

      // Gentle twinkling
      const twinkle = 0.3 + Math.sin(t * 2 + mote.phase) * 0.3;
      mesh.scale.setScalar(twinkle);
    });
  });

  return (
    <group ref={groupRef}>
      {motes.map((mote) => (
        <mesh key={mote.key} position={[mote.x, mote.y, mote.z]}>
          <planeGeometry args={[mote.size, mote.size]} />
          <meshBasicMaterial color="#aabbdd" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
