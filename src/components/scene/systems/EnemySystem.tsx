/**
 * Enemy Rendering System
 *
 * Renders each enemy entity as a 3D bubble with:
 * - Colored sphere with glow
 * - Type icon (emoji)
 * - Word label
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
  const { position, enemy } = entity;
  const isEncrypted = enemy.encrypted;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Smooth position update
    groupRef.current.position.x = gx(position.x);
    groupRef.current.position.y = gy(position.y);
    groupRef.current.position.z = position.z;

    // Gentle float bob
    groupRef.current.position.y += Math.sin(clock.elapsedTime * 2 + entity.enemy.gameId) * 0.02;
  });

  const displayColor = isEncrypted ? '#444444' : enemy.color;
  const radius = enemy.variant === 'child' ? 0.2 : 0.3;

  return (
    <group ref={groupRef}>
      {/* Glow sphere (larger, transparent) — vivid halo like original 2D */}
      <mesh>
        <sphereGeometry args={[radius + 0.12, 16, 16]} />
        <meshBasicMaterial color={displayColor} transparent opacity={0.15} />
      </mesh>

      {/* Main bubble — saturated with strong emissive */}
      <mesh>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Highlight spot */}
      <mesh position={[-0.06, 0.08, radius * 0.9]}>
        <circleGeometry args={[0.06, 8]} />
        <meshBasicMaterial color="white" transparent opacity={0.2} />
      </mesh>

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
            [-gx(position.x), -gy(position.y) + gy(400), 0],
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
