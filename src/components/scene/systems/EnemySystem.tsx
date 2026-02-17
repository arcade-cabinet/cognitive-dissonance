/**
 * Enemy Rendering System — Glass Iridescent Bubbles
 *
 * Renders each enemy entity as a 3D glass bubble with:
 * - Iridescent MeshPhysicalMaterial (transmission, clearcoat, IOR)
 * - Inner emissive glow sphere
 * - Specular highlight spot
 * - Type icon (emoji) and word label
 * - Connection line to character
 * - Variant effects (encrypted: "?", child: smaller)
 *
 * Uses miniplex ECS to iterate enemy entities.
 * Coordinates: game space (800x600) mapped to scene space via g2s().
 */

import { Billboard, Line, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { ECS } from '../../../ecs/react';
import { enemies } from '../../../ecs/world';
import { CHARACTER_Y } from '../../../lib/constants';
import { gx, gy } from '../coordinates';

export function EnemySystem() {
  return (
    <ECS.Entities in={enemies}>
      {(entity) => <EnemyMesh key={entity.enemy.gameId} entity={entity} />}
    </ECS.Entities>
  );
}

function EnemyMesh({ entity }: { entity: (typeof enemies.entities)[number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const innerGlowRef = useRef<THREE.MeshStandardMaterial>(null);
  const outerShellRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const { position, enemy } = entity;
  const isEncrypted = enemy.encrypted;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // Smooth position update
    groupRef.current.position.x = gx(position.x);
    groupRef.current.position.y = gy(position.y);
    groupRef.current.position.z = position.z;

    // Gentle float bob
    groupRef.current.position.y += Math.sin(t * 2 + entity.enemy.gameId) * 0.02;

    // Pulsing inner glow
    if (innerGlowRef.current) {
      innerGlowRef.current.emissiveIntensity =
        0.4 + Math.sin(t * 3 + entity.enemy.gameId * 0.5) * 0.2;
    }

    // Shell iridescence animation via clearcoat roughness oscillation
    if (outerShellRef.current) {
      outerShellRef.current.clearcoatRoughness =
        0.02 + Math.sin(t * 1.5 + entity.enemy.gameId) * 0.01;
    }
  });

  const displayColor = isEncrypted ? '#444444' : enemy.color;
  const radius = enemy.variant === 'child' ? 0.2 : 0.3;

  return (
    <group ref={groupRef}>
      {/* Outer glow aura — vivid halo */}
      <mesh>
        <sphereGeometry args={[radius + 0.15, 24, 24]} />
        <meshBasicMaterial color={displayColor} transparent opacity={0.08} />
      </mesh>

      {/* Main glass bubble shell — iridescent PBR material */}
      <mesh>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshPhysicalMaterial
          ref={outerShellRef}
          color={displayColor}
          roughness={0.05}
          metalness={0.0}
          transmission={isEncrypted ? 0 : 0.5}
          thickness={0.4}
          ior={1.45}
          clearcoat={1.0}
          clearcoatRoughness={0.02}
          transparent
          opacity={isEncrypted ? 0.9 : 0.75}
          envMapIntensity={1.2}
          emissive={displayColor}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Inner emissive glow core — visible through the glass shell */}
      <mesh>
        <sphereGeometry args={[radius * 0.6, 16, 16]} />
        <meshStandardMaterial
          ref={innerGlowRef}
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Specular highlight — refraction spot */}
      <mesh position={[-0.06, 0.08, radius * 0.92]}>
        <circleGeometry args={[0.05, 12]} />
        <meshBasicMaterial color="white" transparent opacity={0.35} />
      </mesh>

      {/* Secondary highlight — bottom-right */}
      <mesh position={[0.04, -0.04, radius * 0.88]} rotation={[0, 0, 0.5]}>
        <circleGeometry args={[0.025, 8]} />
        <meshBasicMaterial color="white" transparent opacity={0.15} />
      </mesh>

      {/* Point light for local glow illumination */}
      <pointLight color={displayColor} intensity={0.3} distance={1.5} decay={2} />

      {/* Icon */}
      <Billboard position={[0, 0.05, radius + 0.01]}>
        <Text fontSize={0.14} anchorX="center" anchorY="middle">
          {isEncrypted ? '?' : enemy.icon}
        </Text>
      </Billboard>

      {/* Word label */}
      {!isEncrypted && (
        <Billboard position={[0, -0.12, radius + 0.01]}>
          <Text
            fontSize={0.06}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.005}
            outlineColor="black"
          >
            {enemy.word}
          </Text>
        </Billboard>
      )}

      {/* Connection line to character (center) */}
      {!isEncrypted && (
        <Line
          points={[
            [0, 0, 0],
            [-gx(position.x), -gy(position.y) + gy(CHARACTER_Y), 0],
          ]}
          color="white"
          lineWidth={0.5}
          transparent
          opacity={0.04}
          dashed
          dashSize={0.1}
          gapSize={0.15}
        />
      )}
    </group>
  );
}
