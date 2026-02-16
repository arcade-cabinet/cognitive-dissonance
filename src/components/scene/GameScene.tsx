/**
 * Main Game Scene
 *
 * Orchestrates all 3D rendering systems within the R3F Canvas.
 * Receives game state from the worker via ref and distributes to:
 * - RoomBackground: 3D diorama environment
 * - CharacterModel: Brother/Psyduck with panic state transitions
 * - EnemySystem: ECS-driven enemy bubble rendering
 * - ParticleSystem, TrailSystem, ConfettiSystem: ECS-driven VFX
 * - BossSystem: Boss encounter rendering
 * - Screen shake via camera displacement
 * - Flash overlay via fullscreen quad
 */

import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import {
  clearAllEntities,
  spawnConfetti,
  spawnParticles,
  syncStateToECS,
} from '../../ecs/state-sync';
import type { GameState } from '../../lib/events';
import { CharacterModel } from './CharacterModel';
import { RoomBackground } from './RoomBackground';
import { BossSystem } from './systems/BossSystem';
import { EnemySystem } from './systems/EnemySystem';
import { ConfettiSystem, ParticleSystem, TrailSystem } from './systems/ParticleSystem';

export interface GameSceneHandle {
  updateState: (state: GameState) => void;
  spawnParticles: (x: number, y: number, color: string) => void;
  spawnConfetti: () => void;
  reset: () => void;
}

export const GameScene = forwardRef<GameSceneHandle>(function GameScene(_, ref) {
  const stateRef = useRef<GameState | null>(null);
  const panicRef = useRef(0);
  const waveRef = useRef(0);
  const shakeRef = useRef(0);
  const flashRef = useRef({ alpha: 0, color: '#ffffff' });

  // Set scene background to a visible dark blue (not pure black)
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color('#0e0e28');
  }, [scene]);

  useImperativeHandle(ref, () => ({
    updateState(state: GameState) {
      stateRef.current = state;
      panicRef.current = state.panic;
      waveRef.current = state.wave;
      shakeRef.current = state.shake;
      flashRef.current = { alpha: state.fl, color: state.flCol };

      // Sync ECS entities
      syncStateToECS(state);
    },
    spawnParticles(x: number, y: number, color: string) {
      spawnParticles(x, y, color);
    },
    spawnConfetti() {
      spawnConfetti();
    },
    reset() {
      clearAllEntities();
      panicRef.current = 0;
      waveRef.current = 0;
      shakeRef.current = 0;
      flashRef.current = { alpha: 0, color: '#ffffff' };
    },
  }));

  return (
    <>
      {/* Camera and post-processing */}
      <CameraController shakeRef={shakeRef} />

      {/* Environment */}
      <RoomBackground panic={panicRef.current} wave={waveRef.current} />

      {/* Character */}
      <CharacterModel panic={panicRef.current} />

      {/* ECS-driven entities */}
      <EnemySystem />
      <BossSystem wave={waveRef.current} />
      <ParticleSystem />
      <TrailSystem />
      <ConfettiSystem />

      {/* Flash overlay */}
      <FlashOverlay flashRef={flashRef} />
    </>
  );
});

/** Camera with screen shake */
function CameraController({ shakeRef }: { shakeRef: React.RefObject<number> }) {
  const { camera } = useThree();
  const basePosRef = useRef(new THREE.Vector3(0, 0.5, 6));

  useEffect(() => {
    camera.position.copy(basePosRef.current);
    camera.lookAt(0, -0.5, 0);
  }, [camera]);

  useFrame(() => {
    const shake = shakeRef.current;
    if (shake > 0) {
      const intensity = shake * 0.01;
      camera.position.set(
        basePosRef.current.x + (Math.random() - 0.5) * intensity,
        basePosRef.current.y + (Math.random() - 0.5) * intensity,
        basePosRef.current.z
      );
    } else {
      camera.position.copy(basePosRef.current);
    }
  });

  return null;
}

/** Fullscreen flash effect */
function FlashOverlay({
  flashRef,
}: {
  flashRef: React.RefObject<{ alpha: number; color: string }>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const flash = flashRef.current;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (flash.alpha > 0) {
      mat.opacity = flash.alpha;
      mat.color.set(flash.color);
      meshRef.current.visible = true;
    } else {
      meshRef.current.visible = false;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 5]} visible={false}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial transparent opacity={0} depthTest={false} />
    </mesh>
  );
}
