/**
 * 3D Mechanical Keyboard Controls — Dynamic Keycap UI
 *
 * The keyboard IS the entire interface. Keycaps change labels based on game state:
 * - Menu:      Center key shows ▶ START, others dark
 * - Playing:   F1-F4 show abilities, Space bar shows ⏸ PAUSE
 * - Paused:    F1-F4 dark, Space bar shows ▶ RESUME
 * - Game Over: F2 ↻ RETRY, F3 ∞ ENDLESS (if won), others dark
 *
 * RGB Backlighting System:
 * - Continuous spectrum: deep blue → cyan → green → yellow → orange → red
 * - Rolling wave pattern that travels across keys
 * - Pulse frequency and emissive intensity rise with panic
 * - Edge-lit RGB strips on the keyboard case
 * - Space bar with stabilizer bars and independent LED
 */

import { Billboard, Text } from '@react-three/drei';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { colors } from '../../design/tokens';

// ─── Types ───────────────────────────────────────────────────

export type ScreenMode = 'start' | 'playing' | 'gameover' | 'paused';

export interface CooldownState {
  abilityCd: { reality: number; history: number; logic: number };
  abilityMax: { reality: number; history: number; logic: number };
  nukeCd: number;
  nukeMax: number;
}

interface KeyboardControlsProps {
  panicRef: React.RefObject<number>;
  cooldownRef: React.RefObject<CooldownState>;
  screenMode: ScreenMode;
  isWin?: boolean;
  onAbility: (type: 'reality' | 'history' | 'logic') => void;
  onNuke: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onEndless: () => void;
}

// ─── Dynamic key definitions per screen mode ─────────────────

interface DynamicKeyDef {
  label: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  abilityType?: 'reality' | 'history' | 'logic' | 'nuke';
}

const DARK_KEY: DynamicKeyDef = {
  label: '',
  name: '',
  icon: '',
  color: '#0a0a18',
  active: false,
};

function getFKeyDefs(mode: ScreenMode, isWin: boolean): DynamicKeyDef[] {
  switch (mode) {
    case 'start':
      return [
        DARK_KEY,
        { label: '', name: 'START', icon: '\u25B6', color: '#00cc88', active: true },
        DARK_KEY,
        DARK_KEY,
      ];
    case 'playing':
      return [
        {
          label: 'F1',
          name: 'REALITY',
          icon: '\u{1F9A0}',
          color: colors.accent.reality,
          active: true,
          abilityType: 'reality',
        },
        {
          label: 'F2',
          name: 'HISTORY',
          icon: '\u{1F4C8}',
          color: colors.accent.history,
          active: true,
          abilityType: 'history',
        },
        {
          label: 'F3',
          name: 'LOGIC',
          icon: '\u{1F916}',
          color: colors.accent.logic,
          active: true,
          abilityType: 'logic',
        },
        {
          label: 'F4',
          name: 'NUKE',
          icon: '\u{1F4A5}',
          color: colors.semantic.error,
          active: true,
          abilityType: 'nuke',
        },
      ];
    case 'paused':
      return [DARK_KEY, DARK_KEY, DARK_KEY, DARK_KEY];
    case 'gameover':
      return [
        DARK_KEY,
        { label: '', name: 'RETRY', icon: '\u21BB', color: '#e74c3c', active: true },
        isWin
          ? { label: '', name: 'ENDLESS', icon: '\u221E', color: '#00ccff', active: true }
          : DARK_KEY,
        DARK_KEY,
      ];
  }
}

// ─── Dimensions ──────────────────────────────────────────────

const KEY_W = 0.8;
const KEY_D = 0.5;
const KEY_H = 0.07;
const KEY_GAP = 0.1;
const KEY_SPACING = KEY_W + KEY_GAP;
const FKEY_COUNT = 4;
const TOTAL_FKEY_W = FKEY_COUNT * KEY_W + (FKEY_COUNT - 1) * KEY_GAP;
const START_X = -TOTAL_FKEY_W / 2 + KEY_W / 2;

// Space bar
const SPACE_W = 2.4;
const SPACE_Z = 0.6;

// Stable key IDs for React (never reorder)
const FKEY_IDS = ['fkey-f1', 'fkey-f2', 'fkey-f3', 'fkey-f4'] as const;

// Case (accommodates F-key row + space bar row)
const CASE_Z_CENTER = 0.25;
const CASE_Z_DEPTH = 1.3;

// Reusable colors (avoid per-frame allocations)
const _gray = new THREE.Color('#333333');
const _full = new THREE.Color();
const _rgbColor = new THREE.Color();

/**
 * Compute panic-driven RGB color along a continuous HSL spectrum.
 * 0% = deep blue, 50% = green/yellow, 100% = red
 */
function panicToRgbColor(panic: number, phaseOffset: number, time: number): THREE.Color {
  const pNorm = panic / 100;
  const waveSpeed = 2 + pNorm * 6;
  const wave = Math.sin(time * waveSpeed + phaseOffset) * 0.5 + 0.5;
  const hueShift = wave * 0.08;
  const baseHue = 0.6 - pNorm * 0.6;
  const hue = Math.max(0, Math.min(1, baseHue + hueShift));
  const saturation = 0.7 + pNorm * 0.3;
  const lightness = 0.45 + pNorm * 0.15;
  _rgbColor.setHSL(hue, saturation, lightness);
  return _rgbColor;
}

// ─── Main Component ──────────────────────────────────────────

export function KeyboardControls({
  panicRef,
  cooldownRef,
  screenMode,
  isWin = false,
  onAbility,
  onNuke,
  onStart,
  onPause,
  onResume,
  onRetry,
  onEndless,
}: KeyboardControlsProps) {
  const keyDefs = getFKeyDefs(screenMode, isWin);

  const getFKeyHandler = useCallback(
    (index: number): (() => void) | null => {
      switch (screenMode) {
        case 'start':
          return index === 1 ? onStart : null;
        case 'playing':
          if (index === 0) return () => onAbility('reality');
          if (index === 1) return () => onAbility('history');
          if (index === 2) return () => onAbility('logic');
          return onNuke;
        case 'gameover':
          if (index === 1) return onRetry;
          if (index === 2 && isWin) return onEndless;
          return null;
        default:
          return null;
      }
    },
    [screenMode, isWin, onAbility, onNuke, onStart, onRetry, onEndless]
  );

  const spaceHandler =
    screenMode === 'playing' ? onPause : screenMode === 'paused' ? onResume : null;
  const spaceLabel = screenMode === 'playing' ? 'PAUSE' : screenMode === 'paused' ? 'RESUME' : '';
  const spaceIcon = screenMode === 'playing' ? '\u23F8' : screenMode === 'paused' ? '\u25B6' : '';
  const spaceColor =
    screenMode === 'paused' ? '#00cc88' : screenMode === 'playing' ? '#2a2a4a' : '#0a0a18';
  const spaceActive = screenMode === 'playing' || screenMode === 'paused';

  return (
    <group position={[0, -1.92, 0.6]} rotation={[-0.12, 0, 0]}>
      {/* Keyboard case — brushed aluminum housing */}
      <mesh position={[0, -0.04, CASE_Z_CENTER]}>
        <boxGeometry args={[TOTAL_FKEY_W + 0.45, 0.06, CASE_Z_DEPTH]} />
        <meshPhysicalMaterial
          color="#1a1a2e"
          roughness={0.35}
          metalness={0.85}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
        />
      </mesh>

      {/* Plate surface — anodized aluminum */}
      <mesh position={[0, -0.009, CASE_Z_CENTER]}>
        <boxGeometry args={[TOTAL_FKEY_W + 0.35, 0.005, CASE_Z_DEPTH - 0.15]} />
        <meshPhysicalMaterial
          color="#0f0f1e"
          roughness={0.25}
          metalness={0.92}
          clearcoat={0.2}
          clearcoatRoughness={0.3}
        />
      </mesh>

      {/* Plate front edge — chamfered highlight */}
      <mesh position={[0, -0.01, CASE_Z_CENTER + CASE_Z_DEPTH / 2]}>
        <boxGeometry args={[TOTAL_FKEY_W + 0.45, 0.015, 0.025]} />
        <meshPhysicalMaterial color="#2a2a4a" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Screw details on case corners */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh
          key={`screw-${sx}-${sz}`}
          position={[
            sx * (TOTAL_FKEY_W / 2 + 0.12),
            -0.006,
            CASE_Z_CENTER + sz * (CASE_Z_DEPTH / 2 - 0.1),
          ]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.012, 0.012, 0.008, 6]} />
          <meshStandardMaterial color="#444466" roughness={0.2} metalness={0.95} />
        </mesh>
      ))}

      {/* RGB edge-lit strips */}
      <RGBEdgeStrip panicRef={panicRef} side={-1} />
      <RGBEdgeStrip panicRef={panicRef} side={1} />

      {/* RGB underglow */}
      <RGBUnderglow panicRef={panicRef} />

      {/* F-Keys with per-key RGB backlighting */}
      {FKEY_IDS.map((id, i) => (
        <FKey
          key={id}
          keyDef={keyDefs[i]}
          keyIndex={i}
          position={[START_X + i * KEY_SPACING, 0, 0]}
          panicRef={panicRef}
          cooldownRef={cooldownRef}
          screenMode={screenMode}
          onPress={getFKeyHandler(i)}
        />
      ))}

      {/* Space Bar */}
      <SpaceBar
        label={spaceLabel}
        icon={spaceIcon}
        color={spaceColor}
        active={spaceActive}
        panicRef={panicRef}
        onPress={spaceHandler}
      />
    </group>
  );
}

// ─── RGB Edge-Lit Strip ──────────────────────────────────────

function RGBEdgeStrip({ panicRef, side }: { panicRef: React.RefObject<number>; side: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const p = panicRef.current ?? 0;
    const t = clock.elapsedTime;
    const pNorm = p / 100;

    const color = panicToRgbColor(p, side * 1.5, t);
    matRef.current.emissive.copy(color);

    const pulseSpeed = 2 + pNorm * 8;
    const pulseDepth = 0.15 + pNorm * 0.35;
    const pulse = 1 - Math.sin(t * pulseSpeed) * pulseDepth;
    matRef.current.emissiveIntensity = (0.3 + pNorm * 0.7) * pulse;
  });

  return (
    <mesh
      position={[side * (TOTAL_FKEY_W / 2 + 0.21), -0.03, CASE_Z_CENTER]}
      rotation={[0, 0, side * 0.05]}
    >
      <boxGeometry args={[0.015, 0.04, CASE_Z_DEPTH - 0.1]} />
      <meshStandardMaterial
        ref={matRef}
        color="#080812"
        emissive="#3388ff"
        emissiveIntensity={0.3}
        roughness={0.2}
        metalness={0.1}
      />
    </mesh>
  );
}

// ─── RGB Underglow Light ─────────────────────────────────────

function RGBUnderglow({ panicRef }: { panicRef: React.RefObject<number> }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const p = panicRef.current ?? 0;
    const t = clock.elapsedTime;
    const pNorm = p / 100;

    const color = panicToRgbColor(p, 0, t);
    lightRef.current.color.copy(color);

    const pulseSpeed = 2 + pNorm * 6;
    const pulse = 1 + Math.sin(t * pulseSpeed) * (0.1 + pNorm * 0.3);
    lightRef.current.intensity = (1.2 + pNorm * 2.5) * pulse;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, -0.08, CASE_Z_CENTER]}
      intensity={1.5}
      distance={3}
      decay={2}
      color={colors.scene.monitorGlow}
    />
  );
}

// ─── Individual F-Key ────────────────────────────────────────

interface FKeyProps {
  keyDef: DynamicKeyDef;
  keyIndex: number;
  position: [number, number, number];
  panicRef: React.RefObject<number>;
  cooldownRef: React.RefObject<CooldownState>;
  screenMode: ScreenMode;
  onPress: (() => void) | null;
}

function FKey({
  keyDef,
  keyIndex,
  position,
  panicRef,
  cooldownRef,
  screenMode,
  onPress,
}: FKeyProps) {
  const keycapGroupRef = useRef<THREE.Group>(null);
  const keycapMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ledMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const cooldownBarRef = useRef<THREE.Mesh>(null);
  const perKeyLightRef = useRef<THREE.PointLight>(null);
  const pressYRef = useRef(0);
  const isPressedRef = useRef(false);

  const phaseOffset = keyIndex * 1.2;

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
      isPressedRef.current = false;
    };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = panicRef.current ?? 0;
    const pNorm = p / 100;

    // ── Spring animation for key press ──
    const target = isPressedRef.current ? -0.05 : 0;
    pressYRef.current += (target - pressYRef.current) * 0.25;
    if (keycapGroupRef.current) {
      keycapGroupRef.current.position.y = pressYRef.current;
    }

    // ── Cooldown (only in playing mode with ability keys) ──
    let ready = true;
    let progress = 1;
    if (screenMode === 'playing' && keyDef.abilityType) {
      const cd = cooldownRef.current;
      if (cd) {
        let remaining: number;
        let max: number;
        if (keyDef.abilityType === 'nuke') {
          remaining = cd.nukeCd;
          max = cd.nukeMax;
        } else {
          remaining = cd.abilityCd[keyDef.abilityType];
          max = cd.abilityMax[keyDef.abilityType];
        }
        ready = remaining <= 0;
        progress = max > 0 ? Math.max(0, 1 - remaining / max) : 1;
      }
    }

    // ── Keycap color ──
    if (keycapMatRef.current) {
      if (!keyDef.active) {
        keycapMatRef.current.color.set('#0a0a18');
        keycapMatRef.current.emissive.set('#000000');
        keycapMatRef.current.emissiveIntensity = 0;
      } else if (ready) {
        keycapMatRef.current.color.set(keyDef.color);
        keycapMatRef.current.emissive.set(keyDef.color);
        keycapMatRef.current.emissiveIntensity = 0.2;
      } else {
        _full.set(keyDef.color);
        keycapMatRef.current.color.copy(_gray).lerp(_full, progress);
        keycapMatRef.current.emissive.copy(_gray).lerp(_full, progress * 0.5);
        keycapMatRef.current.emissiveIntensity = 0.05 + progress * 0.15;
      }
    }

    // ── Cooldown bar ──
    if (cooldownBarRef.current) {
      if (ready || !keyDef.active) {
        cooldownBarRef.current.visible = false;
      } else {
        cooldownBarRef.current.visible = true;
        cooldownBarRef.current.scale.x = Math.max(0.01, progress);
        cooldownBarRef.current.position.x = -(KEY_W * (1 - progress)) / 2;
      }
    }

    // ── Per-key RGB LED backlighting ──
    const rgbColor = panicToRgbColor(p, phaseOffset, t);

    if (ledMatRef.current) {
      if (!keyDef.active) {
        ledMatRef.current.emissiveIntensity = 0.02;
        ledMatRef.current.emissive.set('#111122');
      } else {
        ledMatRef.current.emissive.copy(rgbColor);
        const pulseSpeed = 2 + pNorm * 8;
        const pulseDepth = 0.1 + pNorm * 0.4;
        const keyPulse = Math.sin(t * pulseSpeed + phaseOffset * 0.5);
        const intensityBase = ready ? 0.5 + pNorm * 1.2 : 0.1;
        ledMatRef.current.emissiveIntensity = intensityBase + keyPulse * pulseDepth * intensityBase;
      }
    }

    // ── Per-key point light ──
    if (perKeyLightRef.current) {
      if (!keyDef.active) {
        perKeyLightRef.current.intensity = 0;
      } else {
        perKeyLightRef.current.color.copy(rgbColor);
        const lightPulse = Math.sin(t * (3 + pNorm * 5) + phaseOffset);
        perKeyLightRef.current.intensity = (0.2 + pNorm * 0.6) * (1 + lightPulse * 0.3);
      }
    }
  });

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!onPress) return;
      e.stopPropagation();
      isPressedRef.current = true;
      onPress();
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    },
    [onPress]
  );

  const handlePointerUp = useCallback(() => {
    isPressedRef.current = false;
  }, []);

  const handlePointerOver = useCallback(() => {
    if (onPress) document.body.style.cursor = 'pointer';
  }, [onPress]);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'auto';
    isPressedRef.current = false;
  }, []);

  return (
    <group position={position}>
      {/* Switch well */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[KEY_W + 0.02, 0.04, KEY_D + 0.02]} />
        <meshStandardMaterial color="#060610" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Switch housing */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[KEY_W * 0.5, 0.015, KEY_D * 0.5]} />
        <meshStandardMaterial color="#333344" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* RGB LED strip under keycap */}
      <mesh position={[0, -0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[KEY_W - 0.04, KEY_D - 0.04]} />
        <meshStandardMaterial
          ref={ledMatRef}
          color="#080808"
          emissive="#3388ff"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Per-key point light */}
      <pointLight
        ref={perKeyLightRef}
        position={[0, -0.04, 0]}
        intensity={0.3}
        distance={1.0}
        decay={2}
        color="#3388ff"
      />

      {/* Keycap group (animates on press) */}
      <group ref={keycapGroupRef}>
        <mesh
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={[KEY_W, KEY_H, KEY_D]} />
          <meshPhysicalMaterial
            ref={keycapMatRef}
            color={keyDef.color}
            emissive={keyDef.color}
            emissiveIntensity={0.2}
            roughness={0.35}
            metalness={0.05}
            clearcoat={0.4}
            clearcoatRoughness={0.15}
          />
        </mesh>

        {/* Keycap top edge highlight */}
        <mesh position={[0, KEY_H / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[KEY_W - 0.04, KEY_D - 0.04]} />
          <meshBasicMaterial color="white" transparent opacity={0.06} />
        </mesh>

        {/* Cooldown progress bar */}
        <mesh
          ref={cooldownBarRef}
          position={[0, KEY_H / 2 + 0.005, KEY_D / 2 + 0.001]}
          visible={false}
        >
          <planeGeometry args={[KEY_W, 0.02]} />
          <meshBasicMaterial color="white" transparent opacity={0.6} />
        </mesh>

        {/* Labels — Billboard so always readable from camera */}
        {keyDef.active && (
          <Billboard position={[0, KEY_H / 2 + 0.02, 0]}>
            {keyDef.label !== '' && (
              <Text
                position={[0, 0.1, 0]}
                fontSize={0.055}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.004}
                outlineColor="black"
              >
                {keyDef.label}
              </Text>
            )}
            {keyDef.icon !== '' && (
              <Text position={[0, 0.02, 0]} fontSize={0.1} anchorX="center" anchorY="middle">
                {keyDef.icon}
              </Text>
            )}
            {keyDef.name !== '' && (
              <Text
                position={[0, -0.06, 0]}
                fontSize={0.04}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.003}
                outlineColor="black"
              >
                {keyDef.name}
              </Text>
            )}
          </Billboard>
        )}
      </group>
    </group>
  );
}

// ─── Space Bar ───────────────────────────────────────────────

interface SpaceBarProps {
  label: string;
  icon: string;
  color: string;
  active: boolean;
  panicRef: React.RefObject<number>;
  onPress: (() => void) | null;
}

function SpaceBar({ label, icon, color, active, panicRef, onPress }: SpaceBarProps) {
  const keycapGroupRef = useRef<THREE.Group>(null);
  const keycapMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ledMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const perKeyLightRef = useRef<THREE.PointLight>(null);
  const pressYRef = useRef(0);
  const isPressedRef = useRef(false);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
      isPressedRef.current = false;
    };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = panicRef.current ?? 0;
    const pNorm = p / 100;

    // Spring animation
    const target = isPressedRef.current ? -0.05 : 0;
    pressYRef.current += (target - pressYRef.current) * 0.25;
    if (keycapGroupRef.current) {
      keycapGroupRef.current.position.y = pressYRef.current;
    }

    // Keycap color
    if (keycapMatRef.current) {
      if (!active) {
        keycapMatRef.current.color.set('#0a0a18');
        keycapMatRef.current.emissive.set('#000000');
        keycapMatRef.current.emissiveIntensity = 0;
      } else {
        keycapMatRef.current.color.set(color);
        keycapMatRef.current.emissive.set(color);
        keycapMatRef.current.emissiveIntensity = 0.15;
      }
    }

    // LED
    const rgbColor = panicToRgbColor(p, 3.0, t);
    if (ledMatRef.current) {
      if (!active) {
        ledMatRef.current.emissiveIntensity = 0.02;
        ledMatRef.current.emissive.set('#111122');
      } else {
        ledMatRef.current.emissive.copy(rgbColor);
        const pulseSpeed = 2 + pNorm * 8;
        const keyPulse = Math.sin(t * pulseSpeed + 3.0);
        ledMatRef.current.emissiveIntensity = 0.4 + pNorm * 0.8 + keyPulse * 0.15;
      }
    }

    // Point light
    if (perKeyLightRef.current) {
      if (!active) {
        perKeyLightRef.current.intensity = 0;
      } else {
        perKeyLightRef.current.color.copy(rgbColor);
        perKeyLightRef.current.intensity = 0.2 + pNorm * 0.5;
      }
    }
  });

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!onPress) return;
      e.stopPropagation();
      isPressedRef.current = true;
      onPress();
      if ('vibrate' in navigator) navigator.vibrate(10);
    },
    [onPress]
  );

  const handlePointerUp = useCallback(() => {
    isPressedRef.current = false;
  }, []);

  const handlePointerOver = useCallback(() => {
    if (onPress) document.body.style.cursor = 'pointer';
  }, [onPress]);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'auto';
    isPressedRef.current = false;
  }, []);

  return (
    <group position={[0, 0, SPACE_Z]}>
      {/* Switch well */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[SPACE_W + 0.02, 0.04, KEY_D + 0.02]} />
        <meshStandardMaterial color="#060610" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* RGB LED strip */}
      <mesh position={[0, -0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SPACE_W - 0.04, KEY_D - 0.04]} />
        <meshStandardMaterial
          ref={ledMatRef}
          color="#080808"
          emissive="#3388ff"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Point light */}
      <pointLight
        ref={perKeyLightRef}
        position={[0, -0.04, 0]}
        intensity={0.3}
        distance={1.5}
        decay={2}
        color="#3388ff"
      />

      {/* Keycap */}
      <group ref={keycapGroupRef}>
        <mesh
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={[SPACE_W, KEY_H, KEY_D]} />
          <meshPhysicalMaterial
            ref={keycapMatRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.15}
            roughness={0.35}
            metalness={0.05}
            clearcoat={0.4}
            clearcoatRoughness={0.15}
          />
        </mesh>

        {/* Top highlight */}
        <mesh position={[0, KEY_H / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SPACE_W - 0.04, KEY_D - 0.04]} />
          <meshBasicMaterial color="white" transparent opacity={0.06} />
        </mesh>

        {/* Labels */}
        {active && (
          <Billboard position={[0, KEY_H / 2 + 0.02, 0]}>
            {icon !== '' && (
              <Text position={[-0.15, 0.01, 0]} fontSize={0.09} anchorX="center" anchorY="middle">
                {icon}
              </Text>
            )}
            {label !== '' && (
              <Text
                position={[0.15, 0.01, 0]}
                fontSize={0.055}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.004}
                outlineColor="black"
              >
                {label}
              </Text>
            )}
          </Billboard>
        )}

        {/* Stabilizer bars (mechanical detail) */}
        {[-0.7, 0.7].map((xOff) => (
          <mesh key={`stab-${xOff}`} position={[xOff, -KEY_H / 2 - 0.005, 0]}>
            <boxGeometry args={[0.03, 0.01, KEY_D * 0.6]} />
            <meshStandardMaterial color="#444466" roughness={0.3} metalness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
