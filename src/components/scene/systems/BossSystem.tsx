/**
 * Boss Rendering System — Crystalline Faceted Entity
 *
 * Renders the boss entity with:
 * - Icosahedron geometry (crystalline faceted look)
 * - PBR material with clearcoat for gem-like appearance
 * - Pulsing emissive energy veins (inner glow shell)
 * - Semi-transparent outer shell with transmission
 * - Orbiting glass orbs (reality/history/logic)
 * - Distortion aura field
 * - iFrame flash effect
 * - Boss emoji and HP display
 */

import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useRef } from 'react';
import * as THREE from 'three';
import { colors } from '../../../design/tokens';
import { ECS } from '../../../ecs/react';
import { bosses } from '../../../ecs/world';
import { gx, gy } from '../coordinates';

interface BossSystemProps {
  waveRef: React.RefObject<number>;
}

export function BossSystem({ waveRef }: BossSystemProps) {
  return (
    <ECS.Entities in={bosses}>
      {(entity) => <BossMesh entity={entity} waveRef={waveRef} />}
    </ECS.Entities>
  );
}

function BossMesh({
  entity,
  waveRef,
}: {
  entity: (typeof bosses.entities)[number];
  waveRef: React.RefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const outerShellRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const innerCoreRef = useRef<THREE.MeshStandardMaterial>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const orbGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    groupRef.current.position.set(gx(entity.position.x), gy(entity.position.y), 0);

    // Pulsing scale — boss breathes
    const pulse = 1 + Math.sin(t * 3) * 0.04;
    groupRef.current.scale.setScalar(pulse);

    // Slow rotation for crystalline facet glints
    groupRef.current.rotation.y = t * 0.15;
    groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.05;

    // Outer shell: animate emissive intensity for energy pulse
    if (outerShellRef.current) {
      const emissivePulse = 0.2 + Math.sin(t * 4) * 0.1;
      outerShellRef.current.emissiveIntensity = entity.boss.iFrame > 0 ? 1.5 : emissivePulse;
    }

    // Inner core: strong emissive pulsing
    if (innerCoreRef.current) {
      innerCoreRef.current.emissiveIntensity = 0.6 + Math.sin(t * 6) * 0.3;
    }

    // Distortion aura: oscillating scale and rotation
    if (auraRef.current) {
      const auraScale = 1.3 + Math.sin(t * 2) * 0.1;
      auraRef.current.scale.setScalar(auraScale);
      auraRef.current.rotation.z = t * 0.3;
      auraRef.current.rotation.x = t * 0.2;
      const auraMat = auraRef.current.material as THREE.MeshBasicMaterial;
      auraMat.opacity = 0.06 + Math.sin(t * 3) * 0.03;
    }

    // Orbiting orbs
    if (orbGroupRef.current) {
      orbGroupRef.current.rotation.y = t * 0.8;
      orbGroupRef.current.rotation.x = Math.sin(t * 0.4) * 0.15;
    }
  });

  const iFrameFlash = entity.boss.iFrame > 0;
  const bossEmoji = (waveRef.current ?? 0) >= 4 ? '\u{1F9E0}' : '\u{1F682}'; // brain : train
  const bossColor = iFrameFlash ? colors.boss.flash : colors.boss.primary;

  return (
    <group ref={groupRef}>
      {/* Distortion aura field — heat-haze zone around boss */}
      <mesh ref={auraRef}>
        <icosahedronGeometry args={[1.0, 1]} />
        <meshBasicMaterial
          color={colors.boss.primary}
          transparent
          opacity={0.06}
          wireframe
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer crystalline shell — semi-transparent with clearcoat */}
      <mesh>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshPhysicalMaterial
          ref={outerShellRef}
          color={bossColor}
          roughness={0.08}
          metalness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.03}
          transmission={iFrameFlash ? 0 : 0.25}
          thickness={0.8}
          ior={2.0}
          envMapIntensity={1.5}
          emissive={bossColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Inner energy core — visible through the shell */}
      <mesh>
        <icosahedronGeometry args={[0.3, 2]} />
        <meshStandardMaterial
          ref={innerCoreRef}
          color={bossColor}
          emissive={colors.boss.primary}
          emissiveIntensity={0.6}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Boss icon */}
      <Billboard position={[0, 0, 0.55]}>
        <Text fontSize={0.3} anchorX="center" anchorY="middle">
          {bossEmoji}
        </Text>
      </Billboard>

      {/* HP display */}
      <Billboard position={[0, 0.75, 0]}>
        <Text
          fontSize={0.08}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="black"
        >
          {`${entity.boss.hp}/${entity.boss.maxHp}`}
        </Text>
      </Billboard>

      {/* Orbiting orbs — glass-like with transmission */}
      <group ref={orbGroupRef}>
        {(['reality', 'history', 'logic'] as const).map((type, idx) => {
          const color = colors.accent[type];
          const angle = (idx * Math.PI * 2) / 3;
          return (
            <mesh key={`orb-${type}`} position={[Math.cos(angle) * 0.7, Math.sin(angle) * 0.4, 0]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshPhysicalMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                roughness={0.1}
                metalness={0.0}
                transmission={0.3}
                thickness={0.3}
                clearcoat={1.0}
                clearcoatRoughness={0.05}
                transparent
                opacity={0.8}
              />
            </mesh>
          );
        })}
      </group>

      {/* Boss point lights for dramatic illumination */}
      <pointLight color={colors.boss.primary} intensity={3} distance={4} decay={2} />
      <pointLight
        color={colors.boss.primary}
        intensity={1}
        distance={2}
        decay={2}
        position={[0, 0.5, 0]}
      />
    </group>
  );
}
