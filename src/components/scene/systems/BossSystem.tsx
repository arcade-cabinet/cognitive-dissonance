/**
 * Boss Rendering System
 *
 * Renders the boss entity as a menacing 3D sphere with:
 * - Pulsing red glow
 * - Orbiting color orbs (reality/history/logic)
 * - iFrame flash effect
 * - Boss emoji (train for wave 3, brain for wave 5)
 * - HP bar rendered in HTML overlay (not here)
 */

import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { colors } from '../../../design/tokens';
import { ECS } from '../../../ecs/react';
import { bosses } from '../../../ecs/world';
import { GAME_HEIGHT, GAME_WIDTH } from '../../../lib/constants';

function gx(x: number): number {
  return (x - GAME_WIDTH / 2) / 100;
}

function gy(y: number): number {
  return -(y - GAME_HEIGHT / 2) / 100;
}

interface BossSystemProps {
  wave: number;
}

export function BossSystem({ wave }: BossSystemProps) {
  return (
    <ECS.Entities in={bosses}>{(entity) => <BossMesh entity={entity} wave={wave} />}</ECS.Entities>
  );
}

function BossMesh({ entity, wave }: { entity: (typeof bosses.entities)[number]; wave: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const orbGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    groupRef.current.position.set(gx(entity.position.x), gy(entity.position.y), 0);

    // Pulsing scale
    const pulse = 1 + Math.sin(t * 3) * 0.05;
    groupRef.current.scale.setScalar(pulse);

    // Glow pulse
    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.15 + Math.sin(t * 4) * 0.05;
    }

    // Orbiting orbs
    if (orbGroupRef.current) {
      orbGroupRef.current.rotation.y = t * 0.8;
    }
  });

  const iFrameFlash = entity.boss.iFrame > 0;
  const bossEmoji = wave >= 4 ? '\u{1F9E0}' : '\u{1F682}'; // brain : train

  return (
    <group ref={groupRef}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial color={colors.boss.primary} transparent opacity={0.15} />
      </mesh>

      {/* Main boss sphere */}
      <mesh>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial
          color={iFrameFlash ? colors.boss.flash : colors.boss.primary}
          emissive={iFrameFlash ? colors.boss.flash : colors.boss.primary}
          emissiveIntensity={iFrameFlash ? 1 : 0.4}
          roughness={0.3}
        />
      </mesh>

      {/* Boss icon */}
      <Billboard position={[0, 0, 0.5]}>
        <Text fontSize={0.3} anchorX="center" anchorY="middle">
          {bossEmoji}
        </Text>
      </Billboard>

      {/* HP text */}
      <Billboard position={[0, 0.7, 0]}>
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

      {/* Orbiting orbs — reality (orange), history (green), logic (purple) */}
      <group ref={orbGroupRef}>
        {(['reality', 'history', 'logic'] as const).map((type, idx) => {
          const color = colors.accent[type];
          const angle = (idx * Math.PI * 2) / 3;
          return (
            <mesh
              key={`orb-${type}`}
              position={[Math.cos(angle) * 0.65, Math.sin(angle) * 0.35, 0]}
            >
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.4}
                transparent
                opacity={0.7}
              />
            </mesh>
          );
        })}
      </group>

      {/* Boss point light (red glow) */}
      <pointLight color={colors.boss.primary} intensity={2} distance={3} decay={2} />
    </group>
  );
}
