/**
 * Particle, Trail, and Confetti Rendering Systems
 *
 * Three separate ECS-driven systems for visual effects:
 * - ParticleSystem: Burst particles on enemy counter (gravity, fade, shrink)
 * - TrailSystem: Expanding ring effects on counter
 * - ConfettiSystem: Victory celebration confetti rain
 *
 * Each system queries its archetype from miniplex and handles
 * both physics updates and rendering in useFrame.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ECS } from '../../../ecs/react';
import { confettis, particles, trails, world } from '../../../ecs/world';
import { gx, gy } from '../coordinates';

// ─── Particles ───────────────────────────────────────────────

export function ParticleSystem() {
  return <ECS.Entities in={particles}>{(entity) => <ParticleMesh entity={entity} />}</ECS.Entities>;
}

function ParticleMesh({ entity }: { entity: (typeof particles.entities)[number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05); // Cap delta for stability

    // Physics update
    entity.position.x += entity.velocity.vx * dt * 60;
    entity.position.y += entity.velocity.vy * dt * 60;
    entity.position.z += entity.velocity.vz * dt * 60;
    entity.velocity.vy -= 0.02 * dt * 60; // Gravity (scene space, Y is up)

    entity.particle.life -= 0.025 * dt * 60;

    // Update mesh
    meshRef.current.position.set(gx(entity.position.x), gy(entity.position.y), entity.position.z);
    meshRef.current.scale.setScalar(Math.max(0.01, entity.particle.life));
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, entity.particle.life);

    // Remove when dead
    if (entity.particle.life <= 0) {
      world.remove(entity);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[entity.particle.size, 6, 6]} />
      <meshBasicMaterial color={entity.particle.color} transparent opacity={1} />
    </mesh>
  );
}

// ─── Trails (Expanding Rings) ────────────────────────────────

export function TrailSystem() {
  return <ECS.Entities in={trails}>{(entity) => <TrailMesh entity={entity} />}</ECS.Entities>;
}

function TrailMesh({ entity }: { entity: (typeof trails.entities)[number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);
    entity.trail.life -= 0.03 * dt * 60;

    const expandedRadius = entity.trail.radius * (1 - entity.trail.life);
    meshRef.current.position.set(gx(entity.position.x), gy(entity.position.y), entity.position.z);
    meshRef.current.scale.setScalar(Math.max(0.01, expandedRadius));

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, entity.trail.life * 0.4);

    if (entity.trail.life <= 0) {
      world.remove(entity);
    }
  });

  return (
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      <torusGeometry args={[1, 0.03, 8, 32]} />
      <meshBasicMaterial
        color={entity.trail.color}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Confetti ────────────────────────────────────────────────

export function ConfettiSystem() {
  return <ECS.Entities in={confettis}>{(entity) => <ConfettiMesh entity={entity} />}</ECS.Entities>;
}

function ConfettiMesh({ entity }: { entity: (typeof confettis.entities)[number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rotation = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);

    // Physics
    entity.position.x += entity.velocity.vx * dt * 60;
    entity.position.y += entity.velocity.vy * dt * 60;
    entity.position.z += entity.velocity.vz * dt * 60;
    entity.velocity.vy -= 0.001 * dt * 60; // Light gravity

    entity.confetti.life -= 0.006 * dt * 60;
    rotation.current += entity.confetti.rotationSpeed * dt * 60;

    meshRef.current.position.set(entity.position.x, entity.position.y, entity.position.z);
    meshRef.current.rotation.set(rotation.current, rotation.current * 0.7, 0);

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, entity.confetti.life);

    if (entity.confetti.life <= 0) {
      world.remove(entity);
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[entity.confetti.width, entity.confetti.height]} />
      <meshBasicMaterial
        color={entity.confetti.color}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
