/**
 * Character Bust — NS-5 Style Android (Rear View)
 *
 * Inspired by I, Robot (2004) procedural android design.
 * Camera looks over the android's shoulder. We see:
 * - Back of head: smooth pearlescent shell with panel seams, status LEDs
 * - Neck: dark metallic with stacked joint rings, visible cables
 * - Shoulders: shell plate caps over cable bundles, mechanical joints
 *
 * Tension escalation is CONTINUOUS (panic 0-100):
 *   0-25%:  Nominal. LEDs green. Smooth operation. Slow breathing cycle.
 *   25-50%: LEDs amber. Processing load visible. Minor heat shimmer.
 *   50-75%: LEDs red pulsing. Cables tighten. Head micro-jitter. Sparks.
 *   75-99%: Critical. Shell cracks glow. Violent shake. Arc discharge.
 *   100%:   Head explosion (handled by parent via game-over state).
 *
 * Materials: MeshPhysicalMaterial (clearcoat, transmission) for shell,
 * MeshStandardMaterial (metalness) for joints/cables. All procedural.
 */

import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { colors } from '../../design/tokens';

const ch = colors.character;

// Pre-allocated for per-frame lerping
const _calmGlow = new THREE.Color(ch.eyeGlow);
const _stressGlow = new THREE.Color(ch.eyeStress);
const _shellBase = new THREE.Color(ch.shell);
const _shellWarm = new THREE.Color(ch.shellWarm);
const _cableBase = new THREE.Color(ch.cable);
const _cableStress = new THREE.Color(ch.cableStress);
const _ledGreen = new THREE.Color(ch.statusLed);
const _ledAmber = new THREE.Color(ch.statusWarn);
const _ledRed = new THREE.Color(ch.statusCrit);
const _tempColor = new THREE.Color();

interface CharacterBustProps {
  panicRef: React.RefObject<number>;
}

export function CharacterBust({ panicRef }: CharacterBustProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const shoulderLRef = useRef<THREE.Group>(null);
  const shoulderRRef = useRef<THREE.Group>(null);
  const shellMatRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const panic = panicRef.current ?? 0;
    const pNorm = panic / 100;

    // ── Breathing (servo cycle) ──
    const breathFreq = 1.5 + pNorm * 2.5;
    const breathAmp = 0.008 * (1 - pNorm * 0.3);
    const breathY = Math.sin(t * breathFreq) * breathAmp;

    // ── Shoulder rise (servo tension) ──
    const shoulderRise = pNorm * pNorm * 0.12;

    if (shoulderLRef.current && shoulderRRef.current) {
      shoulderLRef.current.position.y = -0.32 + shoulderRise + breathY;
      shoulderRRef.current.position.y = -0.32 + shoulderRise + breathY;

      // Shoulders pinch inward under load
      const pinch = pNorm * pNorm * 0.04;
      shoulderLRef.current.position.x = -0.38 + pinch;
      shoulderRRef.current.position.x = 0.38 - pinch;
    }

    // ── Head tremor (servo instability) ──
    if (headRef.current) {
      headRef.current.position.y = 0.18 + shoulderRise * 0.3 + breathY * 0.3;

      if (panic > 25) {
        const tremorAmp = Math.min(0.02, ((panic - 25) / 75) * 0.02);
        const tremorFreq = 10 + pNorm * 25;
        headRef.current.position.x = Math.sin(t * tremorFreq) * tremorAmp;
        headRef.current.rotation.z = Math.sin(t * tremorFreq * 1.3) * tremorAmp * 0.4;
      } else {
        headRef.current.position.x = Math.sin(t * 0.3) * 0.002;
        headRef.current.rotation.z = 0;
      }

      // Head tilt forward with stress (like Sonny concentrating)
      headRef.current.rotation.x = pNorm * 0.15;

      // Head swell at extreme panic
      if (panic > 75) {
        const swell = 1 + ((panic - 75) / 25) * 0.06;
        headRef.current.scale.setScalar(swell);
      } else {
        headRef.current.scale.setScalar(1);
      }
    }

    // ── Shell warm tint under stress ──
    if (shellMatRef.current) {
      const warmT = pNorm * pNorm * 0.4;
      _tempColor.copy(_shellBase).lerp(_shellWarm, warmT);
      shellMatRef.current.color.copy(_tempColor);
      // Increase emissive at high panic (internal heat glow)
      const emissiveT = Math.max(0, (panic - 60) / 40);
      shellMatRef.current.emissive.setRGB(emissiveT * 0.15, emissiveT * 0.05, emissiveT * 0.02);

      // Progressive clearcoat degradation under stress (shell cracking)
      shellMatRef.current.clearcoat = 0.72 - pNorm * 0.3;
      shellMatRef.current.clearcoatRoughness = 0.09 + pNorm * pNorm * 0.15;

      // Roughness increases with panic (surface degradation)
      shellMatRef.current.roughness = 0.19 + pNorm * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.7, 0]}>
      {/* ── HEAD GROUP ── */}
      <group ref={headRef} position={[0, 0.18, 0]}>
        <AndroidSkull shellMatRef={shellMatRef} />
        <PanelSeams />
        <StatusLEDs panicRef={panicRef} />
        <EarVents />
      </group>

      {/* ── NECK ── */}
      <AndroidNeck panicRef={panicRef} />

      {/* ── LEFT SHOULDER ── */}
      <group ref={shoulderLRef} position={[-0.38, -0.32, 0]}>
        <ShoulderAssembly side="left" />
      </group>

      {/* ── RIGHT SHOULDER ── */}
      <group ref={shoulderRRef} position={[0.38, -0.32, 0]}>
        <ShoulderAssembly side="right" />
      </group>

      {/* ── UPPER TORSO (visible between shoulders) ── */}
      <UpperTorso />

      {/* ── CABLE BUNDLES (visible between plates) ── */}
      <CableBundles panicRef={panicRef} />

      {/* ── HEAT SHIMMER (40%+ panic) ── */}
      <HeatShimmer panicRef={panicRef} />

      {/* ── ELECTRICAL SPARKS (50%+ panic) ── */}
      <ElectricalSparks panicRef={panicRef} />

      {/* ── ARC DISCHARGE (75%+ panic) ── */}
      <ArcDischarge panicRef={panicRef} />

      {/* ── SHELL CRACK GLOW (60%+ panic) ── */}
      <ShellCrackGlow panicRef={panicRef} />
    </group>
  );
}

// ─── Android Skull (back of head) ─────────────────────────────

function AndroidSkull({
  shellMatRef,
}: {
  shellMatRef: React.RefObject<THREE.MeshPhysicalMaterial | null>;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.3, 32, 24);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Flatten the front face (camera sees the back)
      if (v.z > 0.12) {
        v.z = 0.12 + (v.z - 0.12) * 0.25;
      }

      // Slight vertical elongation (android cranial proportions)
      v.y *= 1.12;

      // Flatten top slightly (not a perfect sphere)
      if (v.y > 0.2) {
        v.y = 0.2 + (v.y - 0.2) * 0.85;
      }

      // Temporal narrowing at the sides
      if (Math.abs(v.x) > 0.2 && v.y > -0.05 && v.y < 0.15) {
        v.x *= 0.96;
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        ref={shellMatRef}
        color={ch.shell}
        roughness={0.19}
        metalness={0.06}
        clearcoat={0.72}
        clearcoatRoughness={0.09}
        envMapIntensity={1.15}
      />
    </mesh>
  );
}

// ─── Panel Seams ──────────────────────────────────────────────

function PanelSeams() {
  // Dark lines showing where shell panels meet — visible from behind
  return (
    <group>
      {/* Center seam (sagittal line down back of head) */}
      <mesh position={[0, 0.02, -0.29]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.008, 0.45, 0.008]} />
        <meshStandardMaterial color={ch.panelSeam} roughness={0.7} metalness={0.5} />
      </mesh>

      {/* Horizontal seam (coronal line across back) */}
      <mesh position={[0, 0.05, -0.28]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.4, 0.006, 0.008]} />
        <meshStandardMaterial color={ch.panelSeam} roughness={0.7} metalness={0.5} />
      </mesh>

      {/* Diagonal seams (from center to temples) */}
      <mesh position={[-0.12, 0.12, -0.26]} rotation={[0, 0.3, 0.4]}>
        <boxGeometry args={[0.18, 0.005, 0.006]} />
        <meshStandardMaterial color={ch.panelSeam} roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[0.12, 0.12, -0.26]} rotation={[0, -0.3, -0.4]}>
        <boxGeometry args={[0.18, 0.005, 0.006]} />
        <meshStandardMaterial color={ch.panelSeam} roughness={0.7} metalness={0.5} />
      </mesh>
    </group>
  );
}

// ─── Status LEDs ──────────────────────────────────────────────

function StatusLEDs({ panicRef }: { panicRef: React.RefObject<number> }) {
  const led1Ref = useRef<THREE.MeshStandardMaterial>(null);
  const led2Ref = useRef<THREE.MeshStandardMaterial>(null);
  const led3Ref = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const panic = panicRef.current ?? 0;
    const t = clock.elapsedTime;

    // LED color: green → amber → red with panic
    if (panic < 25) {
      _tempColor.copy(_ledGreen);
    } else if (panic < 50) {
      const lerped = (panic - 25) / 25;
      _tempColor.copy(_ledGreen).lerp(_ledAmber, lerped);
    } else if (panic < 75) {
      const lerped = (panic - 50) / 25;
      _tempColor.copy(_ledAmber).lerp(_ledRed, lerped);
    } else {
      _tempColor.copy(_ledRed);
    }

    // Pulse rate increases with panic
    const pulseFreq = 1 + (panic / 100) * 8;
    const pulse = panic > 50 ? 0.5 + Math.sin(t * pulseFreq) * 0.5 : 1;

    const refs = [led1Ref, led2Ref, led3Ref];
    refs.forEach((ref, i) => {
      if (!ref.current) return;
      ref.current.emissive.copy(_tempColor);
      // Stagger the pulse slightly per LED at high panic
      const stagger = panic > 75 ? Math.sin(t * pulseFreq + i * 0.8) * 0.3 : 0;
      ref.current.emissiveIntensity = (1.5 + stagger) * pulse;
    });
  });

  // Three status LEDs along the back-center seam
  return (
    <group>
      {[0.15, 0.05, -0.05].map((y, i) => (
        <mesh key={`led-${y}`} position={[0, y, -0.305]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial
            ref={i === 0 ? led1Ref : i === 1 ? led2Ref : led3Ref}
            color="#111111"
            emissive={ch.statusLed}
            emissiveIntensity={1.5}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Ear Vents ────────────────────────────────────────────────

function EarVents() {
  // Cooling vent grilles on the sides of the head
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={`vent-${side}`} position={[side * 0.28, -0.02, 0.05]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={`slot-${side}-${i}`}
              position={[0, i * 0.025 - 0.035, 0]}
              rotation={[0, side * 0.4, 0]}
            >
              <boxGeometry args={[0.06, 0.008, 0.02]} />
              <meshStandardMaterial color={ch.dark} roughness={0.6} metalness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

// ─── Android Neck ─────────────────────────────────────────────

function AndroidNeck({ panicRef }: { panicRef: React.RefObject<number> }) {
  const cableGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!cableGroupRef.current) return;
    const panic = panicRef.current ?? 0;
    const pNorm = panic / 100;

    // Cables tighten (scale Y stretches) with panic
    cableGroupRef.current.children.forEach((child) => {
      child.scale.y = 1 + pNorm * 0.08;
    });
  });

  // Neck cable curves (4 cables visible from behind)
  const cables = useMemo(() => {
    const angles = [-0.4, -0.15, 0.15, 0.4];
    return angles.map((ang) => {
      const x = Math.sin(ang) * 0.065;
      const z = Math.cos(ang) * 0.065;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x * 0.8, 0.12, z * 0.8 - 0.04),
        new THREE.Vector3(x, 0.0, z - 0.03),
        new THREE.Vector3(x * 1.1, -0.12, z * 1.1 - 0.02),
      ]);
      return new THREE.TubeGeometry(curve, 16, 0.009, 8, false);
    });
  }, []);

  return (
    <group position={[0, -0.08, 0.02]}>
      {/* Central neck column (dark metallic) */}
      <mesh>
        <cylinderGeometry args={[0.09, 0.11, 0.28, 16]} />
        <meshStandardMaterial color={ch.dark} roughness={0.52} metalness={0.94} />
      </mesh>

      {/* Joint rings (stacked) */}
      {[0.1, 0.04, -0.02, -0.08].map((y) => (
        <mesh key={`ring-${y}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.095 + Math.abs(y) * 0.05, 0.008, 10, 24]} />
          <meshStandardMaterial color={ch.joint} roughness={0.22} metalness={0.97} />
        </mesh>
      ))}

      {/* Cables */}
      <group ref={cableGroupRef}>
        {cables.map((geo, i) => (
          <mesh key={`cable-${i}`} geometry={geo}>
            <meshStandardMaterial color={ch.cable} roughness={0.58} metalness={0.28} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── Shoulder Assembly ────────────────────────────────────────

function ShoulderAssembly({ side }: { side: 'left' | 'right' }) {
  const scaleX = side === 'left' ? 1 : -1;

  const capGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.18, 20, 16);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Flatten bottom (shoulder cap sits on top)
      if (v.y < -0.02) v.y *= 0.35;
      // Compress depth
      v.z *= 0.72;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Cable bundle under the shoulder cap
  const shoulderCables = useMemo(() => {
    const cableGeos: THREE.TubeGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 0.6 + Math.PI * 0.2;
      const r = 0.03;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0.05, z),
        new THREE.Vector3(x * 1.3, -0.1, z * 1.2),
        new THREE.Vector3(x * 1.1, -0.22, z * 1.0),
      ]);
      cableGeos.push(new THREE.TubeGeometry(curve, 12, 0.007, 6, false));
    }
    return cableGeos;
  }, []);

  return (
    <group scale={[scaleX, 1, 1]}>
      {/* Shoulder cap (shell material) */}
      <mesh geometry={capGeo}>
        <meshPhysicalMaterial
          color={ch.shell}
          roughness={0.19}
          metalness={0.06}
          clearcoat={0.72}
          clearcoatRoughness={0.09}
        />
      </mesh>

      {/* Ball joint visible beneath */}
      <mesh position={[0, -0.04, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={ch.joint} roughness={0.22} metalness={0.97} />
      </mesh>

      {/* Cable bundle */}
      {shoulderCables.map((geo, i) => (
        <mesh key={`shoulder-cable-${side}-${i}`} geometry={geo}>
          <meshStandardMaterial color={ch.cable} roughness={0.58} metalness={0.28} />
        </mesh>
      ))}

      {/* Upper arm taper */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.2, 12]} />
        <meshStandardMaterial color={ch.dark} roughness={0.52} metalness={0.85} />
      </mesh>

      {/* Panel seam on shoulder cap */}
      <mesh position={[0, 0.05, -0.13]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.22, 0.004, 0.005]} />
        <meshStandardMaterial color={ch.panelSeam} roughness={0.7} metalness={0.5} />
      </mesh>
    </group>
  );
}

// ─── Upper Torso ──────────────────────────────────────────────

function UpperTorso() {
  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.55, 0.35, 0.22, 8, 6, 4);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Round the edges (superellipse effect)
      const edgeX = Math.abs(v.x) / 0.275;
      const edgeY = Math.abs(v.y) / 0.175;
      if (edgeX > 0.8 || edgeY > 0.8) {
        const factor = 1 - Math.max(0, (Math.max(edgeX, edgeY) - 0.8) * 0.3);
        v.z *= factor;
      }

      // Slight back curvature
      if (v.z < -0.05) {
        v.z -= Math.abs(v.x) * 0.08;
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group position={[0, -0.45, 0.02]}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={ch.shell}
          roughness={0.22}
          metalness={0.08}
          clearcoat={0.5}
          clearcoatRoughness={0.12}
        />
      </mesh>

      {/* Spine channel (dark groove on back) */}
      <mesh position={[0, 0, -0.12]}>
        <boxGeometry args={[0.04, 0.3, 0.03]} />
        <meshStandardMaterial color={ch.dark} roughness={0.52} metalness={0.94} />
      </mesh>

      {/* Spine vertebrae detail */}
      {[-0.1, -0.03, 0.04, 0.11].map((y) => (
        <mesh key={`vert-${y}`} position={[0, y, -0.13]}>
          <boxGeometry args={[0.06, 0.02, 0.015]} />
          <meshStandardMaterial color={ch.joint} roughness={0.3} metalness={0.9} />
        </mesh>
      ))}

      {/* Central panel seam */}
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[0.005, 0.3, 0.005]} />
        <meshStandardMaterial color={ch.panelSeam} roughness={0.7} metalness={0.5} />
      </mesh>
    </group>
  );
}

// ─── Cable Bundles ────────────────────────────────────────────

function CableBundles({ panicRef }: { panicRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const cableMats = useRef<THREE.MeshStandardMaterial[]>([]);

  // Cable paths from neck to shoulders (visible between plates)
  const cables = useMemo(() => {
    const paths = [
      // Left side cables
      [
        new THREE.Vector3(-0.08, 0.0, -0.06),
        new THREE.Vector3(-0.2, -0.15, -0.04),
        new THREE.Vector3(-0.32, -0.28, -0.02),
      ],
      [
        new THREE.Vector3(-0.06, -0.02, -0.08),
        new THREE.Vector3(-0.18, -0.18, -0.06),
        new THREE.Vector3(-0.28, -0.32, -0.04),
      ],
      // Right side cables
      [
        new THREE.Vector3(0.08, 0.0, -0.06),
        new THREE.Vector3(0.2, -0.15, -0.04),
        new THREE.Vector3(0.32, -0.28, -0.02),
      ],
      [
        new THREE.Vector3(0.06, -0.02, -0.08),
        new THREE.Vector3(0.18, -0.18, -0.06),
        new THREE.Vector3(0.28, -0.32, -0.04),
      ],
    ];
    return paths.map((pts) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      return new THREE.TubeGeometry(curve, 16, 0.008, 7, false);
    });
  }, []);

  useFrame(() => {
    const panic = panicRef.current ?? 0;
    const pNorm = panic / 100;

    // Cables warm in color under stress
    cableMats.current.forEach((mat) => {
      if (!mat) return;
      _tempColor.copy(_cableBase).lerp(_cableStress, pNorm * pNorm);
      mat.color.copy(_tempColor);
    });
  });

  return (
    <group ref={groupRef}>
      {cables.map((geo, i) => (
        <mesh key={`bundle-cable-${i}`} geometry={geo}>
          <meshStandardMaterial
            ref={(el) => {
              if (el) cableMats.current[i] = el;
            }}
            color={ch.cable}
            roughness={0.58}
            metalness={0.28}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Electrical Sparks (50%+ panic) ───────────────────────────

function ElectricalSparks({ panicRef }: { panicRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  const sparks = useMemo(
    () =>
      Array.from({ length: 10 }, (_) => ({
        id: `spark-${Math.random().toString(36).slice(2, 8)}`,
        x: (Math.random() - 0.5) * 0.6,
        y: (Math.random() - 0.5) * 0.5 - 0.1,
        z: -0.15 + Math.random() * -0.1,
        phase: Math.random() * Math.PI * 2,
      })),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const panic = panicRef.current ?? 0;
    const t = clock.elapsedTime;

    const visible = panic > 50;
    groupRef.current.visible = visible;

    if (visible) {
      const intensity = (panic - 50) / 50;
      groupRef.current.children.forEach((child, i) => {
        const spark = sparks[i];
        // Rapid flickering
        child.visible = Math.sin(t * 20 + spark.phase) > 0.6 - intensity * 0.4;
        // Jitter position slightly
        child.position.set(
          spark.x + Math.sin(t * 15 + spark.phase) * 0.02,
          spark.y + Math.cos(t * 18 + spark.phase) * 0.015,
          spark.z
        );
        child.scale.setScalar(0.3 + intensity * 0.7);
      });
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {sparks.map((spark) => (
        <mesh key={spark.id}>
          <boxGeometry args={[0.04, 0.004, 0.004]} />
          <meshBasicMaterial color={ch.spark} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Arc Discharge (75%+ panic) ───────────────────────────────

function ArcDischarge({ panicRef }: { panicRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  const arcs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return {
          id: `arc-${Math.random().toString(36).slice(2, 8)}`,
          x: Math.cos(angle) * 0.4,
          y: 0.05 + Math.sin(angle * 2) * 0.12,
          z: Math.sin(angle) * 0.4,
          phase: Math.random() * Math.PI * 2,
        };
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const panic = panicRef.current ?? 0;
    const t = clock.elapsedTime;

    const visible = panic > 75;
    groupRef.current.visible = visible;

    if (visible) {
      const intensity = (panic - 75) / 25;
      groupRef.current.children.forEach((child, i) => {
        const arc = arcs[i];
        child.visible = Math.sin(t * 14 + arc.phase) > 0.2 - intensity * 0.5;
        child.position.set(
          arc.x + Math.sin(t * 6 + arc.phase) * 0.04,
          arc.y + Math.cos(t * 8 + arc.phase) * 0.03,
          arc.z + Math.sin(t * 7 + arc.phase * 2) * 0.04
        );
        child.scale.setScalar(0.6 + intensity);
      });
      groupRef.current.rotation.y = t * 0.2;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {arcs.map((arc) => (
        <mesh key={arc.id}>
          <boxGeometry args={[0.12, 0.008, 0.008]} />
          <meshBasicMaterial color={ch.spark} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Heat Shimmer (40%+ panic) ────────────────────────────────

function HeatShimmer({ panicRef }: { panicRef: React.RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return;
    const panic = panicRef.current ?? 0;
    const t = clock.elapsedTime;

    const visible = panic > 40;
    meshRef.current.visible = visible;

    if (visible) {
      const intensity = (panic - 40) / 60;
      matRef.current.opacity = intensity * 0.08;

      // Wobble effect: subtle scale oscillation simulating heat distortion
      const wobbleX = 1 + Math.sin(t * 4) * intensity * 0.04;
      const wobbleY = 1 + Math.cos(t * 3.5) * intensity * 0.03;
      meshRef.current.scale.set(wobbleX, wobbleY, 1);

      // Rise slowly like heat waves
      meshRef.current.position.y = 0.3 + Math.sin(t * 1.5) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.3, -0.2]} visible={false}>
      <planeGeometry args={[0.8, 0.6]} />
      <meshBasicMaterial
        ref={matRef}
        color="#ffaa44"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Shell Crack Glow (60%+ panic) ──────────────────────────

function ShellCrackGlow({ panicRef }: { panicRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  const cracks = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const theta = (i / 8) * Math.PI * 2;
        const r = 0.28 + Math.random() * 0.05;
        return {
          id: `crack-${i}`,
          x: Math.cos(theta) * r * 0.3,
          y: Math.sin(theta) * r * 0.5,
          z: -r,
          angle: theta + Math.PI / 2,
          length: 0.06 + Math.random() * 0.08,
        };
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const panic = panicRef.current ?? 0;
    const t = clock.elapsedTime;

    const visible = panic > 60;
    groupRef.current.visible = visible;

    if (visible) {
      const intensity = (panic - 60) / 40;
      groupRef.current.children.forEach((child, i) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        // Pulsing glow from cracks
        mat.opacity = intensity * (0.4 + Math.sin(t * 5 + i) * 0.2);
      });
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {cracks.map((crack) => (
        <mesh key={crack.id} position={[crack.x, crack.y, crack.z]} rotation={[0, 0, crack.angle]}>
          <boxGeometry args={[crack.length, 0.005, 0.005]} />
          <meshBasicMaterial color="#ff6622" transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}
