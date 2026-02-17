/**
 * Main Game Scene — Rear Bust Composition
 *
 * Orchestrates all 3D rendering systems within the R3F Canvas.
 * Camera is behind/above the character, looking over their shoulder.
 *
 * Receives game state from the worker via ref and distributes to:
 * - AtmosphericBackground: Dark void with monitor glow + rim light
 * - CharacterBust: Back of head (hair), shoulders (t-shirt), neck
 * - KeyboardControls: Interactive 3D F-keys with RGB underglow
 * - EnemySystem: ECS-driven enemy bubbles descending toward head
 * - ParticleSystem, TrailSystem, ConfettiSystem: ECS-driven VFX
 * - BossSystem: Boss encounter rendering
 * - Screen shake via camera displacement
 * - Flash overlay via fullscreen quad
 */

import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { colors } from '../../design/tokens';
import {
  clearAllEntities,
  spawnConfetti,
  spawnParticles,
  syncStateToECS,
} from '../../ecs/state-sync';
import type { GameState } from '../../lib/events';
import { AtmosphericBackground } from './AtmosphericBackground';
import { CharacterBust } from './CharacterBust';
import { HeadExplosion } from './HeadExplosion';
import { type CooldownState, KeyboardControls } from './KeyboardControls';
import { PostProcessing } from './PostProcessing';
import { BossSystem } from './systems/BossSystem';
import { EnemySystem } from './systems/EnemySystem';
import { ConfettiSystem, ParticleSystem, TrailSystem } from './systems/ParticleSystem';

export interface GameSceneHandle {
  updateState: (state: GameState) => void;
  spawnParticles: (x: number, y: number, color: string) => void;
  spawnConfetti: () => void;
  triggerHeadExplosion: () => void;
  reset: () => void;
}

export interface GameSceneProps {
  onAbility?: (type: 'reality' | 'history' | 'logic') => void;
  onNuke?: () => void;
}

export const GameScene = forwardRef<GameSceneHandle, GameSceneProps>(function GameScene(
  { onAbility, onNuke },
  ref
) {
  const stateRef = useRef<GameState | null>(null);
  const panicRef = useRef(0);
  const waveRef = useRef(0);
  const shakeRef = useRef(0);
  const flashRef = useRef({ alpha: 0, color: '#ffffff' });
  const explosionActiveRef = useRef(false);
  const cooldownRef = useRef<CooldownState>({
    abilityCd: { reality: 0, history: 0, logic: 0 },
    abilityMax: { reality: 1, history: 1, logic: 1 },
    nukeCd: 0,
    nukeMax: 1,
  });

  // Set scene background to a visible dark blue (not pure black)
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(colors.scene.background);
  }, [scene]);

  useImperativeHandle(ref, () => ({
    updateState(state: GameState) {
      stateRef.current = state;
      panicRef.current = state.panic;
      waveRef.current = state.wave;
      shakeRef.current = state.shake;
      flashRef.current = { alpha: state.fl, color: state.flCol };

      // Update cooldown state for 3D keyboard
      cooldownRef.current = {
        abilityCd: state.abilityCd,
        abilityMax: state.abilityMax,
        nukeCd: state.nukeCd,
        nukeMax: state.nukeMax,
      };

      // Sync ECS entities
      syncStateToECS(state);
    },
    spawnParticles(x: number, y: number, color: string) {
      spawnParticles(x, y, color);
    },
    spawnConfetti() {
      spawnConfetti();
    },
    triggerHeadExplosion() {
      explosionActiveRef.current = true;
    },
    reset() {
      explosionActiveRef.current = false;
      clearAllEntities();
      panicRef.current = 0;
      waveRef.current = 0;
      shakeRef.current = 0;
      flashRef.current = { alpha: 0, color: '#ffffff' };
      cooldownRef.current = {
        abilityCd: { reality: 0, history: 0, logic: 0 },
        abilityMax: { reality: 1, history: 1, logic: 1 },
        nukeCd: 0,
        nukeMax: 1,
      };
    },
  }));

  // No-op handlers for when callbacks aren't provided (start/gameover screen)
  const noopAbility = () => {};
  const noopNuke = () => {};

  return (
    <>
      {/* Camera and post-processing */}
      <CameraController shakeRef={shakeRef} />

      {/* Atmospheric void + lighting */}
      <AtmosphericBackground panicRef={panicRef} />

      {/* Character bust (rear view) */}
      <CharacterBust panicRef={panicRef} />

      {/* 3D Keyboard Controls — interactive F-keys */}
      <KeyboardControls
        panicRef={panicRef}
        cooldownRef={cooldownRef}
        onAbility={onAbility ?? noopAbility}
        onNuke={onNuke ?? noopNuke}
      />

      {/* ECS-driven entities */}
      <EnemySystem />
      <BossSystem waveRef={waveRef} />
      <ParticleSystem />
      <TrailSystem />
      <ConfettiSystem />

      {/* Head explosion effect */}
      <HeadExplosion
        active={explosionActiveRef.current}
        onComplete={() => {
          explosionActiveRef.current = false;
        }}
      />

      {/* Post-processing: Bloom, Chromatic Aberration, Vignette */}
      <PostProcessing panicRef={panicRef} />

      {/* Flash overlay */}
      <FlashOverlay flashRef={flashRef} />
    </>
  );
});

/** Camera with screen shake */
function CameraController({ shakeRef }: { shakeRef: React.RefObject<number> }) {
  const { camera } = useThree();
  // Camera behind and slightly above the character, looking at the back of head
  const basePosRef = useRef(new THREE.Vector3(0, 0.3, 4));

  useEffect(() => {
    camera.position.copy(basePosRef.current);
    camera.lookAt(0, -0.6, 0);
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
