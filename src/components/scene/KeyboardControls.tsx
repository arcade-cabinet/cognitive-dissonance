/**
 * 3D Mechanical Keyboard Controls — F1-F4 Function Keys
 *
 * Interactive 3D keycaps replacing the HTML overlay buttons.
 * Part of the diorama — the brother sits at a desk with this keyboard.
 *
 * Features:
 * - Type-colored keycaps (orange/green/purple/red) from design tokens
 * - RGB LED underglow that shifts with panic (cool cyan → angry red)
 * - Physical key depression on press with haptic feedback
 * - Cooldown: keycap desaturates gray → re-fills with color as CD expires
 * - Billboard labels: F-key number, emoji icon, ability name
 */

import { Billboard, Text } from '@react-three/drei';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { colors } from '../../design/tokens';

// ─── Types ───────────────────────────────────────────────────

export interface CooldownState {
  abilityCd: { reality: number; history: number; logic: number };
  abilityMax: { reality: number; history: number; logic: number };
  nukeCd: number;
  nukeMax: number;
}

interface KeyboardControlsProps {
  panicRef: React.RefObject<number>;
  cooldownRef: React.RefObject<CooldownState>;
  onAbility: (type: 'reality' | 'history' | 'logic') => void;
  onNuke: () => void;
}

// ─── Key definitions ─────────────────────────────────────────

interface KeyDef {
  id: string;
  label: string;
  name: string;
  icon: string;
  color: string;
  abilityType: 'reality' | 'history' | 'logic' | null;
}

const KEY_DEFS: KeyDef[] = [
  {
    id: 'f1',
    label: 'F1',
    name: 'REALITY',
    icon: '\u{1F9A0}',
    color: colors.accent.reality,
    abilityType: 'reality',
  },
  {
    id: 'f2',
    label: 'F2',
    name: 'HISTORY',
    icon: '\u{1F4C8}',
    color: colors.accent.history,
    abilityType: 'history',
  },
  {
    id: 'f3',
    label: 'F3',
    name: 'LOGIC',
    icon: '\u{1F916}',
    color: colors.accent.logic,
    abilityType: 'logic',
  },
  {
    id: 'f4',
    label: 'F4',
    name: 'NUKE',
    icon: '\u{1F4A5}',
    color: colors.semantic.error,
    abilityType: null,
  },
];

// ─── Dimensions ──────────────────────────────────────────────

const KEY_W = 0.8;
const KEY_D = 0.5;
const KEY_H = 0.07;
const KEY_GAP = 0.1;
const KEY_SPACING = KEY_W + KEY_GAP;
const TOTAL_W = KEY_DEFS.length * KEY_W + (KEY_DEFS.length - 1) * KEY_GAP;
const START_X = -TOTAL_W / 2 + KEY_W / 2;

// Reusable colors for per-frame updates (avoid allocations)
const _gray = new THREE.Color('#333333');
const _full = new THREE.Color();
const _panicRgb = { r: 0, g: 0, b: 0 };

/** Compute panic-driven RGB (cool cyan -> angry red). Mutates shared object to avoid allocations. */
function panicToRgb(panic: number): { r: number; g: number; b: number } {
  _panicRgb.r = Math.min(1, (80 + panic * 2) / 255);
  _panicRgb.g = Math.max(0.1, (180 - panic * 2) / 255);
  _panicRgb.b = Math.max(0.15, (220 - panic) / 255);
  return _panicRgb;
}

// ─── Main Component ──────────────────────────────────────────

export function KeyboardControls({
  panicRef,
  cooldownRef,
  onAbility,
  onNuke,
}: KeyboardControlsProps) {
  return (
    <group position={[0, -1.92, 0.6]} rotation={[-0.12, 0, 0]}>
      {/* Keyboard plate — dark aluminum housing */}
      <mesh position={[0, -0.035, 0]}>
        <boxGeometry args={[TOTAL_W + 0.4, 0.05, KEY_D + 0.3]} />
        <meshStandardMaterial color="#12121e" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Plate front edge — subtle highlight */}
      <mesh position={[0, -0.01, (KEY_D + 0.3) / 2]}>
        <boxGeometry args={[TOTAL_W + 0.4, 0.01, 0.02]} />
        <meshStandardMaterial color="#2a2a4a" />
      </mesh>

      {/* RGB underglow — single point light driven by panic */}
      <RGBUnderglow panicRef={panicRef} />

      {/* F-Keys */}
      {KEY_DEFS.map((def, i) => (
        <FKey
          key={def.id}
          keyDef={def}
          position={[START_X + i * KEY_SPACING, 0, 0]}
          panicRef={panicRef}
          cooldownRef={cooldownRef}
          onPress={
            def.abilityType
              ? () => onAbility(def.abilityType as 'reality' | 'history' | 'logic')
              : onNuke
          }
        />
      ))}
    </group>
  );
}

// ─── RGB Underglow Light ─────────────────────────────────────

function RGBUnderglow({ panicRef }: { panicRef: React.RefObject<number> }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const p = panicRef.current ?? 0;
    const { r, g, b } = panicToRgb(p);
    lightRef.current.color.setRGB(r, g, b);
    lightRef.current.intensity = 1.5 + Math.sin(clock.elapsedTime * 3) * 0.3;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, -0.08, 0]}
      intensity={1.5}
      distance={3}
      decay={2}
      color={colors.scene.monitorGlow}
    />
  );
}

// ─── Individual F-Key ────────────────────────────────────────

interface FKeyProps {
  keyDef: KeyDef;
  position: [number, number, number];
  panicRef: React.RefObject<number>;
  cooldownRef: React.RefObject<CooldownState>;
  onPress: () => void;
}

function FKey({ keyDef, position, panicRef, cooldownRef, onPress }: FKeyProps) {
  const keycapGroupRef = useRef<THREE.Group>(null);
  const keycapMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ledMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const cooldownBarRef = useRef<THREE.Mesh>(null);
  const pressYRef = useRef(0);
  const isPressedRef = useRef(false);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
      isPressedRef.current = false;
    };
  }, []);

  useFrame(({ clock }) => {
    // ── Spring animation for key press ──
    const target = isPressedRef.current ? -0.05 : 0;
    pressYRef.current += (target - pressYRef.current) * 0.25;
    if (keycapGroupRef.current) {
      keycapGroupRef.current.position.y = pressYRef.current;
    }

    // ── Get cooldown state ──
    const cd = cooldownRef.current;
    if (!cd) return;
    let remaining: number;
    let max: number;
    if (keyDef.abilityType) {
      remaining = cd.abilityCd[keyDef.abilityType];
      max = cd.abilityMax[keyDef.abilityType];
    } else {
      remaining = cd.nukeCd;
      max = cd.nukeMax;
    }
    const ready = remaining <= 0;
    const progress = max > 0 ? Math.max(0, 1 - remaining / max) : 1;

    // ── Keycap color: gray when cooling down, type color when ready ──
    if (keycapMatRef.current) {
      if (ready) {
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

    // ── Cooldown bar: fills from left as ability recharges ──
    if (cooldownBarRef.current) {
      if (ready) {
        cooldownBarRef.current.visible = false;
      } else {
        cooldownBarRef.current.visible = true;
        cooldownBarRef.current.scale.x = Math.max(0.01, progress);
        cooldownBarRef.current.position.x = -(KEY_W * (1 - progress)) / 2;
      }
    }

    // ── RGB LED strip: panic-driven color ──
    if (ledMatRef.current) {
      const p = panicRef.current ?? 0;
      const { r: ledR, g: ledG, b: ledB } = panicToRgb(p);
      ledMatRef.current.emissive.setRGB(ledR, ledG, ledB);
      ledMatRef.current.emissiveIntensity = ready
        ? 0.6 + Math.sin(clock.elapsedTime * 3) * 0.1
        : 0.15;
    }
  });

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
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
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'auto';
    isPressedRef.current = false;
  }, []);

  return (
    <group position={position}>
      {/* Switch well — recessed dark area under the keycap */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[KEY_W + 0.02, 0.04, KEY_D + 0.02]} />
        <meshStandardMaterial color="#080810" roughness={0.9} />
      </mesh>

      {/* RGB LED strip — emissive plane under the keycap gap */}
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[KEY_W - 0.05, KEY_D - 0.05]} />
        <meshStandardMaterial
          ref={ledMatRef}
          color="#111111"
          emissive={colors.scene.monitorGlow}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Keycap — interactive, depresses on click */}
      <group ref={keycapGroupRef}>
        <mesh
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={[KEY_W, KEY_H, KEY_D]} />
          <meshStandardMaterial
            ref={keycapMatRef}
            color={keyDef.color}
            emissive={keyDef.color}
            emissiveIntensity={0.2}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>

        {/* Cooldown progress bar — front face of keycap */}
        <mesh
          ref={cooldownBarRef}
          position={[0, KEY_H / 2 + 0.005, KEY_D / 2 + 0.001]}
          visible={false}
        >
          <planeGeometry args={[KEY_W, 0.02]} />
          <meshBasicMaterial color="white" transparent opacity={0.6} />
        </mesh>

        {/* Labels — Billboard so always readable from camera */}
        <Billboard position={[0, KEY_H / 2 + 0.02, 0]}>
          {/* F-key label */}
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
          {/* Emoji icon */}
          <Text position={[0, 0.02, 0]} fontSize={0.1} anchorX="center" anchorY="middle">
            {keyDef.icon}
          </Text>
          {/* Ability name */}
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
        </Billboard>
      </group>
    </group>
  );
}
