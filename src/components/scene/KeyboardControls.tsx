/**
 * 3D Mechanical Keyboard Controls — Dynamic Keycap UI
 *
 * The keyboard IS the entire interface. Keycaps change labels based on game state:
 * - Start:     F2 ▶ START, menu keys show NEW GAME / CONTINUE, others dark
 * - Playing:   F1-F4 show abilities, Space bar shows ⏸ PAUSE
 * - Paused:    F1-F4 dark, Space bar shows ▶ RESUME
 * - Game Over: F2 ↻ RETRY, F3 ∞ ENDLESS (if won), menu keys active
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
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { colors } from '../../design/tokens';

// ─── Portrait Shader (mini raymarched SDF on keycap surface) ─

const PORTRAIT_VERT = `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PORTRAIT_FRAG = `
precision highp float;
uniform float u_time;
uniform int u_shape;
uniform vec3 u_color;
varying vec2 v_uv;

const int MAX_STEPS = 32;
const float MAX_DIST = 5.0;
const float SURF_DIST = 0.003;

float sdSphere(vec3 p, float r) { return length(p) - r; }

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  float m = p.x + p.y + p.z - s;
  vec3 q;
  if (3.0 * p.x < m) q = p.xyz;
  else if (3.0 * p.y < m) q = p.yzx;
  else if (3.0 * p.z < m) q = p.zxy;
  else return m * 0.57735027;
  float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
  return length(vec3(q.x, q.y - s + k, q.z - k));
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float opSmoothSubtraction(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}

mat3 rotY(float a) { float s = sin(a), c = cos(a); return mat3(c,0,s,0,1,0,-s,0,c); }
mat3 rotX(float a) { float s = sin(a), c = cos(a); return mat3(1,0,0,0,c,-s,0,s,c); }

float getSDF(vec3 p) {
  p = rotY(u_time * 0.6) * rotX(u_time * 0.2) * p;
  if (u_shape == 0) {
    float sphere = sdSphere(p, 0.7);
    return opSmoothSubtraction(p.y - 0.15, sphere, 0.15);
  } else if (u_shape == 1) {
    return sdOctahedron(p, 0.65);
  } else if (u_shape == 2) {
    return sdTorus(rotX(u_time * 0.4) * p, vec2(0.45, 0.18));
  } else if (u_shape == 3) {
    // NUKE: sphere with sine-wave displacement (crystalline)
    float d = sdSphere(p, 0.6);
    d -= sin(p.x * 8.0) * sin(p.y * 8.0) * sin(p.z * 8.0) * 0.05;
    return d;
  } else if (u_shape == 4) {
    // PLAY: triangular prism (play button)
    vec3 q = rotY(1.5708) * p;
    float d = max(abs(q.z) - 0.3, max(q.x * 0.866 + q.y * 0.5, -q.y) - 0.55);
    return d;
  } else {
    // FAST-FORWARD: two offset triangular prisms
    vec3 q = rotY(1.5708) * p;
    vec3 q1 = q - vec3(0.0, 0.0, -0.25);
    vec3 q2 = q - vec3(0.0, 0.0, 0.25);
    float t1 = max(abs(q1.z) - 0.2, max(q1.x * 0.866 + q1.y * 0.5, -q1.y) - 0.45);
    float t2 = max(abs(q2.z) - 0.2, max(q2.x * 0.866 + q2.y * 0.5, -q2.y) - 0.45);
    return min(t1, t2);
  }
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    getSDF(p + e.xyy) - getSDF(p - e.xyy),
    getSDF(p + e.yxy) - getSDF(p - e.yxy),
    getSDF(p + e.yyx) - getSDF(p - e.yyx)
  ));
}

void main() {
  vec2 uv = (v_uv - 0.5) * 2.0;
  vec3 ro = vec3(0.0, 0.0, 2.0);
  vec3 rd = normalize(vec3(uv, -1.0));

  float totalDist = 0.0;
  vec3 rayPos = ro;
  for (int i = 0; i < MAX_STEPS; i++) {
    float dist = getSDF(rayPos);
    if (dist < SURF_DIST || totalDist > MAX_DIST) break;
    totalDist += dist;
    rayPos = ro + totalDist * rd;
  }

  if (totalDist >= MAX_DIST) { gl_FragColor = vec4(0.0); return; }

  vec3 n = calcNormal(rayPos);
  vec3 v = normalize(ro - rayPos);
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.5);
  float hue = dot(n, v) * 3.14159 + u_time * 0.6;
  vec3 iri = u_color * (0.6 + sin(hue) * 0.4) * fresnel * 1.5;

  float diff = max(dot(n, normalize(vec3(-0.4, 0.8, 0.6))), 0.0);
  vec3 h = normalize(normalize(vec3(-0.4, 0.8, 0.6)) + v);
  float spec = pow(max(dot(n, h), 0.0), 32.0);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);

  vec3 color = vec3(0.05) * (0.15 + diff * 0.35) + iri * 0.9 + vec3(1.0) * spec * 0.4 + u_color * rim * 0.5;
  float alpha = smoothstep(MAX_DIST, MAX_DIST * 0.3, totalDist);
  gl_FragColor = vec4(color, alpha);
}
`;

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
  /** SDF shape index for raymarched portrait (0=denial, 1=delusion, 2=fallacy, 3=nuke) */
  shapeIndex?: number;
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
          label: '',
          name: 'DENIAL',
          icon: '',
          color: colors.accent.reality,
          active: true,
          shapeIndex: 0,
          abilityType: 'reality',
        },
        {
          label: '',
          name: 'DELUSION',
          icon: '',
          color: colors.accent.history,
          active: true,
          shapeIndex: 1,
          abilityType: 'history',
        },
        {
          label: '',
          name: 'FALLACY',
          icon: '',
          color: colors.accent.logic,
          active: true,
          shapeIndex: 2,
          abilityType: 'logic',
        },
        {
          label: '',
          name: 'NUKE',
          icon: '',
          color: colors.semantic.error,
          active: true,
          shapeIndex: 3,
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

// Menu keys (flanking spacebar)
const MENU_KEY_W = 0.7;
const MENU_KEY_GAP = 0.12;

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

      {/* Menu key — NEW GAME (left of spacebar) */}
      <MenuKey
        position={[-(SPACE_W / 2 + MENU_KEY_GAP + MENU_KEY_W / 2), 0, SPACE_Z]}
        name="NEW GAME"
        shapeIndex={4}
        color="#00cc88"
        active={screenMode === 'start' || screenMode === 'gameover'}
        panicRef={panicRef}
        onPress={screenMode === 'start' || screenMode === 'gameover' ? onStart : null}
      />

      {/* Space Bar */}
      <SpaceBar
        label={spaceLabel}
        icon={spaceIcon}
        color={spaceColor}
        active={spaceActive}
        panicRef={panicRef}
        onPress={spaceHandler}
      />

      {/* Menu key — CONTINUE (right of spacebar) */}
      <MenuKey
        position={[SPACE_W / 2 + MENU_KEY_GAP + MENU_KEY_W / 2, 0, SPACE_Z]}
        name="CONTINUE"
        shapeIndex={5}
        color="#00ccff"
        active={screenMode === 'gameover' && isWin}
        panicRef={panicRef}
        onPress={screenMode === 'gameover' && isWin ? onEndless : null}
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

        {/* Portrait SDF shape on keycap surface (playing mode) */}
        {keyDef.shapeIndex !== undefined && keyDef.active && (
          <KeycapPortrait shapeIndex={keyDef.shapeIndex} color={keyDef.color} />
        )}

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
                position={[0, keyDef.shapeIndex !== undefined ? 0.12 : -0.06, 0]}
                fontSize={keyDef.shapeIndex !== undefined ? 0.03 : 0.04}
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

// ─── Keycap Portrait (mini raymarched SDF shape) ────────────

function hexToVec3(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function KeycapPortrait({ shapeIndex, color }: { shapeIndex: number; color: string }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const [r, g, b] = hexToVec3(color);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_shape: { value: shapeIndex },
      u_color: { value: new THREE.Vector3(r, g, b) },
    }),
    [shapeIndex, r, g, b]
  );

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.u_time.value = clock.elapsedTime;
    }
  });

  return (
    <mesh position={[0, KEY_H / 2 + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[KEY_W * 0.75, KEY_D * 0.75]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={PORTRAIT_VERT}
        fragmentShader={PORTRAIT_FRAG}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Menu Key (flanks spacebar) ──────────────────────────────

interface MenuKeyProps {
  position: [number, number, number];
  name: string;
  shapeIndex: number;
  color: string;
  active: boolean;
  panicRef: React.RefObject<number>;
  onPress: (() => void) | null;
}

function MenuKey({ position, name, shapeIndex, color, active, panicRef, onPress }: MenuKeyProps) {
  const keycapGroupRef = useRef<THREE.Group>(null);
  const keycapMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ledMatRef = useRef<THREE.MeshStandardMaterial>(null);
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
        keycapMatRef.current.emissiveIntensity = 0.2;
      }
    }

    // LED
    const rgbColor = panicToRgbColor(p, 5.0, t);
    if (ledMatRef.current) {
      if (!active) {
        ledMatRef.current.emissiveIntensity = 0.02;
        ledMatRef.current.emissive.set('#111122');
      } else {
        ledMatRef.current.emissive.copy(rgbColor);
        ledMatRef.current.emissiveIntensity = 0.4;
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
    <group position={position}>
      {/* Switch well */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[MENU_KEY_W + 0.02, 0.04, KEY_D + 0.02]} />
        <meshStandardMaterial color="#060610" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* RGB LED strip */}
      <mesh position={[0, -0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MENU_KEY_W - 0.04, KEY_D - 0.04]} />
        <meshStandardMaterial
          ref={ledMatRef}
          color="#080808"
          emissive="#3388ff"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Keycap group */}
      <group ref={keycapGroupRef}>
        <mesh
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={[MENU_KEY_W, KEY_H, KEY_D]} />
          <meshPhysicalMaterial
            ref={keycapMatRef}
            color={active ? color : '#0a0a18'}
            emissive={active ? color : '#000000'}
            emissiveIntensity={active ? 0.2 : 0}
            roughness={0.35}
            metalness={0.05}
            clearcoat={0.4}
            clearcoatRoughness={0.15}
          />
        </mesh>

        {/* Top highlight */}
        <mesh position={[0, KEY_H / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[MENU_KEY_W - 0.04, KEY_D - 0.04]} />
          <meshBasicMaterial color="white" transparent opacity={0.06} />
        </mesh>

        {/* Portrait SDF shape */}
        {active && <KeycapPortrait shapeIndex={shapeIndex} color={color} />}

        {/* Label */}
        {active && (
          <Billboard position={[0, KEY_H / 2 + 0.02, 0]}>
            <Text
              position={[0, 0.12, 0]}
              fontSize={0.028}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.003}
              outlineColor="black"
            >
              {name}
            </Text>
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
