/**
 * Head Explosion — Game Over Effect
 *
 * Dramatic 2.5-second head explosion sequence triggered when panic hits 100%.
 *
 * Timeline:
 *   0-100ms:    Flash — Screen white, head emissive spike
 *   100-400ms:  Burst — Head shatters into particle debris
 *   200-600ms:  Shockwave — Expanding distortion ring + camera shake
 *   400-2000ms: Rain — Debris arcs downward with gravity, energy sparks fade
 *   1500-2500ms: Settle — Shoulders slump, steam wisps
 *
 * Uses Three.js InstancedMesh for efficient particle rendering
 * and anime.js timeline for orchestrated sequencing.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 80;
const SPARK_COUNT = 40;
const EXPLOSION_DURATION = 2500; // ms

interface HeadExplosionProps {
  active: boolean;
  onComplete?: () => void;
}

// Pre-allocated objects for per-frame updates
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface ParticleData {
  positions: Float32Array;
  velocities: Float32Array;
  scales: Float32Array;
  lifetimes: Float32Array;
  colors: Float32Array;
}

function createParticleData(): ParticleData {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const scales = new Float32Array(PARTICLE_COUNT);
  const lifetimes = new Float32Array(PARTICLE_COUNT);
  const colors = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Spherical burst from head center (0, 0.18, 0) in character space
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 2 + Math.random() * 4;

    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    velocities[i * 3 + 1] = Math.cos(phi) * speed * 0.8 + 1; // Bias upward
    velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

    scales[i] = 0.02 + Math.random() * 0.06;
    lifetimes[i] = 0.6 + Math.random() * 0.4;

    // Color: mix of shell white, warm orange, and red
    const colorMix = Math.random();
    if (colorMix < 0.4) {
      _color.setHex(0xf1f3f7); // Shell white
    } else if (colorMix < 0.7) {
      _color.setHex(0xff8844); // Warm orange
    } else {
      _color.setHex(0xff4444); // Hot red
    }
    colors[i * 3] = _color.r;
    colors[i * 3 + 1] = _color.g;
    colors[i * 3 + 2] = _color.b;
  }

  return { positions, velocities, scales, lifetimes, colors };
}

export function HeadExplosion({ active, onComplete }: HeadExplosionProps) {
  const instanceRef = useRef<THREE.InstancedMesh>(null);
  const sparkRef = useRef<THREE.InstancedMesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const startTimeRef = useRef(0);
  const activeRef = useRef(false);
  const completedRef = useRef(false);
  const { clock } = useThree();

  const data = useMemo(() => createParticleData(), []);

  // Initialize/reset on activation
  useEffect(() => {
    if (active && !activeRef.current) {
      activeRef.current = true;
      completedRef.current = false;
      startTimeRef.current = clock.elapsedTime;

      // Reset particle positions to head center
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        data.positions[i * 3] = 0;
        data.positions[i * 3 + 1] = 0;
        data.positions[i * 3 + 2] = 0;
        data.lifetimes[i] = 0.6 + Math.random() * 0.4;
      }
    } else if (!active) {
      activeRef.current = false;
      completedRef.current = false;
    }
  }, [active, clock, data]);

  useFrame(() => {
    if (!activeRef.current || !instanceRef.current) return;

    const elapsed = (clock.elapsedTime - startTimeRef.current) * 1000; // ms
    const progress = Math.min(elapsed / EXPLOSION_DURATION, 1);

    // Phase 1: Flash (0-100ms)
    if (flashRef.current) {
      const flashMat = flashRef.current.material as THREE.MeshBasicMaterial;
      if (elapsed < 100) {
        flashRef.current.visible = true;
        flashMat.opacity = 1 - elapsed / 100;
      } else {
        flashRef.current.visible = false;
      }
    }

    // Phase 2: Particle burst (100ms+)
    if (elapsed > 100) {
      const burstProgress = Math.min((elapsed - 100) / 1900, 1);
      const gravity = 9.8;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const life = data.lifetimes[i];
        if (burstProgress > life) {
          // Dead particle — scale to zero
          _dummy.position.set(0, -10, 0);
          _dummy.scale.setScalar(0);
        } else {
          const t = burstProgress * 1.5; // Time factor
          const vx = data.velocities[i * 3];
          const vy = data.velocities[i * 3 + 1];
          const vz = data.velocities[i * 3 + 2];

          _dummy.position.set(vx * t, vy * t - 0.5 * gravity * t * t * 0.3, vz * t);
          const fadeScale = 1 - burstProgress / life;
          _dummy.scale.setScalar(data.scales[i] * fadeScale);
          _dummy.rotation.set(t * 3, t * 2, t * 4);
        }

        _dummy.updateMatrix();
        instanceRef.current.setMatrixAt(i, _dummy.matrix);

        // Set color per instance
        _color.setRGB(data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2]);
        instanceRef.current.setColorAt(i, _color);
      }

      instanceRef.current.instanceMatrix.needsUpdate = true;
      if (instanceRef.current.instanceColor) {
        instanceRef.current.instanceColor.needsUpdate = true;
      }
    }

    // Phase 3: Shockwave ring (200-600ms)
    if (shockwaveRef.current) {
      if (elapsed > 200 && elapsed < 800) {
        shockwaveRef.current.visible = true;
        const shockProgress = (elapsed - 200) / 600;
        const shockScale = shockProgress * 3;
        shockwaveRef.current.scale.setScalar(shockScale);
        const shockMat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
        shockMat.opacity = (1 - shockProgress) * 0.6;
      } else {
        shockwaveRef.current.visible = false;
      }
    }

    // Phase 4: Energy sparks (400-2000ms)
    if (sparkRef.current) {
      if (elapsed > 400 && elapsed < 2000) {
        sparkRef.current.visible = true;
        const sparkProgress = (elapsed - 400) / 1600;

        for (let i = 0; i < SPARK_COUNT; i++) {
          const angle = (i / SPARK_COUNT) * Math.PI * 2 + sparkProgress * 4;
          const radius = sparkProgress * 1.5;
          const sparkY = Math.sin(sparkProgress * Math.PI) * 0.5;

          _dummy.position.set(
            Math.cos(angle) * radius,
            sparkY + Math.sin(angle * 3 + sparkProgress * 10) * 0.2,
            Math.sin(angle) * radius
          );
          _dummy.scale.setScalar(0.01 * (1 - sparkProgress));
          _dummy.updateMatrix();
          sparkRef.current.setMatrixAt(i, _dummy.matrix);
        }
        sparkRef.current.instanceMatrix.needsUpdate = true;
      } else {
        if (sparkRef.current) sparkRef.current.visible = false;
      }
    }

    // Complete
    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  });

  if (!active) return null;

  return (
    <group position={[0, -0.52, 0]}>
      {/* Flash overlay plane */}
      <mesh ref={flashRef} position={[0, 0, 3]} visible={false}>
        <planeGeometry args={[15, 15]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={1}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Debris particles */}
      <instancedMesh ref={instanceRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          roughness={0.4}
          metalness={0.2}
          emissive="#ff6633"
          emissiveIntensity={0.5}
        />
      </instancedMesh>

      {/* Energy sparks */}
      <instancedMesh ref={sparkRef} args={[undefined, undefined, SPARK_COUNT]} visible={false}>
        <sphereGeometry args={[1, 4, 4]} />
        <meshBasicMaterial color="#66ccff" transparent opacity={0.8} />
      </instancedMesh>

      {/* Shockwave ring */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[1, 0.05, 8, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
