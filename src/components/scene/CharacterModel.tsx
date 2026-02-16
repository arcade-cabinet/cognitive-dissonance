/**
 * 3D Character Model - The Brother / Psyduck Transformation
 *
 * Three panic states with smooth transitions:
 * - Normal (0-33%): Calm guy at desk, slight breathing, speech bubble "Is this even real?"
 * - Panic (33-66%): Shaking, arms up, wide eyes, "IT'S EXPONENTIAL!!!"
 * - Psyduck (66-100%): Full yellow duck transformation with psychic aura rings
 *
 * Built from procedural geometry for charm - low-poly meets character.
 */

import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { colors } from '../../design/tokens';

const ch = colors.character;
const psyduck = ch.psyduck;

interface CharacterModelProps {
  panic: number;
}

export function CharacterModel({ panic }: CharacterModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // Breathing animation
    const breathe = Math.sin(t * 2) * 0.02;
    groupRef.current.position.y = -1.0 + breathe;

    // Shake increases with panic
    if (panic > 33) {
      const shakeAmt = ((panic - 33) / 67) * 0.05;
      groupRef.current.position.x = (Math.random() - 0.5) * shakeAmt;
    } else {
      groupRef.current.position.x = 0;
    }

    // Aura rings for psyduck state
    if (auraRef.current && panic > 60) {
      auraRef.current.rotation.y = t * 0.5;
      auraRef.current.visible = true;
      const scale = 0.5 + ((panic - 60) / 40) * 1.5;
      auraRef.current.scale.setScalar(scale);
    } else if (auraRef.current) {
      auraRef.current.visible = false;
    }
  });

  const state = panic < 33 ? 'normal' : panic < 66 ? 'panic' : 'psyduck';

  // Interpolated colors using design tokens
  const skinColor = useMemo(() => {
    if (panic < 33) return ch.normal.skin;
    if (panic < 66) return ch.panic.skin;
    // Lerp from panic skin to Psyduck yellow
    const t = (panic - 66) / 34;
    const r = Math.round(245 + (241 - 245) * t);
    const g = Math.round(203 + (196 - 203) * t);
    const b = Math.round(167 + (15 - 167) * t);
    return `rgb(${r},${g},${b})`;
  }, [panic]);

  const bodyColor = useMemo(() => {
    if (panic < 66) return ch.normal.shirt;
    // Lerp from shirt blue to Psyduck yellow
    const t = (panic - 66) / 34;
    const r = Math.round(52 + (241 - 52) * t);
    const g = Math.round(152 + (196 - 152) * t);
    const b = Math.round(219 + (15 - 219) * t);
    return `rgb(${r},${g},${b})`;
  }, [panic]);

  const speechText =
    state === 'normal'
      ? 'Is this even real?'
      : state === 'panic'
        ? "IT'S EXPONENTIAL!!!"
        : 'PSY-AY-AY!!!';
  const speechColor =
    state === 'normal'
      ? colors.ui.text.muted
      : state === 'panic'
        ? colors.primary.main
        : colors.semantic.error;

  return (
    <group ref={groupRef} position={[0, -1.0, 0]}>
      {/* Shadow on desk */}
      <mesh position={[0, -0.85, 0.1]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.65, 0.14, 1]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="black" transparent opacity={0.35} />
      </mesh>

      {/* Body */}
      <mesh position={[0, -0.3, 0]}>
        <sphereGeometry args={[state === 'psyduck' ? 0.5 : 0.4, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[state === 'psyduck' ? 0.48 : 0.42, 16, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Hair / Psyduck head tuft */}
      {state !== 'psyduck' ? <HumanHair panic={panic} /> : <PsyduckTuft />}

      {/* Eyes */}
      <Eyes state={state} panic={panic} />

      {/* Mouth */}
      {state === 'psyduck' ? (
        // Psyduck beak
        <mesh position={[0, 0.18, 0.42]}>
          <sphereGeometry args={[0.15, 16, 8]} />
          <meshStandardMaterial color={psyduck.beak} roughness={0.5} />
        </mesh>
      ) : (
        // Human mouth
        <mesh position={[0, 0.12, 0.4]}>
          <boxGeometry
            args={[state === 'panic' ? 0.15 : 0.1, state === 'panic' ? 0.08 : 0.02, 0.02]}
          />
          <meshStandardMaterial color={state === 'panic' ? '#111111' : '#c0392b'} />
        </mesh>
      )}

      {/* Arms */}
      <Arms state={state} />

      {/* Legs / Seat */}
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.3]} />
        <meshStandardMaterial color={ch.normal.pants} />
      </mesh>

      {/* Psychic aura rings (psyduck state) — gold and purple like the original */}
      <group ref={auraRef} visible={false}>
        <AuraRing radius={0.8} color={psyduck.body} />
        <AuraRing radius={1.1} color={colors.secondary.dark} />
        <AuraRing radius={1.4} color={psyduck.body} />
      </group>

      {/* Lightning bolts at extreme panic */}
      {panic > 80 && <LightningBolts />}

      {/* Speech bubble */}
      <Billboard position={[0, 1.1, 0]}>
        <Text
          fontSize={0.1}
          color={speechColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="black"
        >
          {speechText}
        </Text>
      </Billboard>
    </group>
  );
}

function HumanHair({ panic }: { panic: number }) {
  const hairColor = ch.normal.hair;
  return (
    <group position={[0, 0.5, 0]}>
      {/* Hair dome */}
      <mesh position={[0, 0.05, -0.05]}>
        <sphereGeometry args={[0.44, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} roughness={0.8} />
      </mesh>
      {/* Hair tuft */}
      {panic < 33 ? (
        <mesh position={[0.05, 0.15, 0]} rotation={[0, 0, 0.2]}>
          <coneGeometry args={[0.06, 0.15, 4]} />
          <meshStandardMaterial color={hairColor} />
        </mesh>
      ) : (
        // Standing up - panic hair
        <>
          <mesh position={[-0.08, 0.2, 0]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.05, 0.2, 4]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.08, 0.22, 0]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.05, 0.22, 4]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
        </>
      )}
    </group>
  );
}

function PsyduckTuft() {
  return (
    <group position={[0, 0.65, 0]}>
      {/* Three spiky tufts */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.01, 0.03, 0.25, 4]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[-0.06, 0.02, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.01, 0.03, 0.2, 4]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[0.06, 0.02, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.01, 0.03, 0.2, 4]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
    </group>
  );
}

function Eyes({ state, panic }: { state: string; panic: number }) {
  const leftPupilRef = useRef<THREE.Mesh>(null);
  const rightPupilRef = useRef<THREE.Mesh>(null);

  // Dynamic pupil movement: darting/twitching based on panic
  useFrame(({ clock }) => {
    if (!leftPupilRef.current || !rightPupilRef.current) return;
    const t = clock.elapsedTime;

    // At low panic, pupils gently look around. At high panic, they dart frantically.
    const speed = 1 + (panic / 100) * 4;
    const amplitude = 0.005 + (panic / 100) * 0.02;
    const dx = Math.sin(t * speed) * amplitude;
    const dy = Math.cos(t * speed * 1.3) * amplitude * 0.5;

    // Psyduck state: pupils go cross-eyed
    const crossEye = state === 'psyduck' ? 0.01 : 0;

    leftPupilRef.current.position.x = -0.12 + dx + crossEye;
    leftPupilRef.current.position.y = dy;
    rightPupilRef.current.position.x = 0.12 + dx - crossEye;
    rightPupilRef.current.position.y = dy;
  });

  // Eye size grows with panic (original: 9px normal -> 12px panic -> 14px duck)
  const eyeRadius = state === 'normal' ? 0.06 : state === 'panic' ? 0.09 : 0.11;
  const pupilRadius = state === 'normal' ? 0.025 : state === 'psyduck' ? 0.012 : 0.012;

  return (
    <group position={[0, 0.3, 0.35]}>
      {/* Left eye white */}
      <mesh position={[-0.12, 0, 0]}>
        <circleGeometry args={[eyeRadius, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      {/* Left pupil - animated via ref */}
      <mesh ref={leftPupilRef} position={[-0.12, 0, 0.01]}>
        <circleGeometry args={[pupilRadius, 16]} />
        <meshBasicMaterial color="#222222" />
      </mesh>
      {/* Eye highlight */}
      <mesh position={[-0.1, 0.02, 0.02]}>
        <circleGeometry args={[0.01, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Right eye white */}
      <mesh position={[0.12, 0, 0]}>
        <circleGeometry args={[eyeRadius, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      {/* Right pupil - animated via ref */}
      <mesh ref={rightPupilRef} position={[0.12, 0, 0.01]}>
        <circleGeometry args={[pupilRadius, 16]} />
        <meshBasicMaterial color="#222222" />
      </mesh>
      {/* Eye highlight */}
      <mesh position={[0.14, 0.02, 0.02]}>
        <circleGeometry args={[0.01, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Eyebrows */}
      {state !== 'psyduck' && (
        <>
          <mesh
            position={[-0.12, eyeRadius + 0.04, 0.01]}
            rotation={[0, 0, state === 'panic' ? -0.3 : 0.15]}
          >
            <boxGeometry args={[0.12, 0.02, 0.01]} />
            <meshStandardMaterial color={ch.normal.hair} />
          </mesh>
          <mesh
            position={[0.12, eyeRadius + 0.04, 0.01]}
            rotation={[0, 0, state === 'panic' ? 0.3 : -0.15]}
          >
            <boxGeometry args={[0.12, 0.02, 0.01]} />
            <meshStandardMaterial color={ch.normal.hair} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Arms({ state }: { state: string }) {
  if (state === 'psyduck') {
    // Wings/flippers — bright Psyduck yellow
    return (
      <>
        <mesh position={[-0.52, -0.15, 0]} rotation={[0, 0, -0.4]}>
          <sphereGeometry args={[0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI]} />
          <meshStandardMaterial color={psyduck.body} roughness={0.6} />
        </mesh>
        <mesh position={[0.52, -0.15, 0]} rotation={[0, 0, 0.4]}>
          <sphereGeometry args={[0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI]} />
          <meshStandardMaterial color={psyduck.body} roughness={0.6} />
        </mesh>
      </>
    );
  }

  if (state === 'panic') {
    // Arms raised up — panic shirt color
    return (
      <>
        <group position={[-0.45, 0.1, 0]} rotation={[0, 0, -0.8]}>
          <mesh>
            <boxGeometry args={[0.12, 0.4, 0.12]} />
            <meshStandardMaterial color={ch.panic.shirt} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={ch.panic.skin} />
          </mesh>
        </group>
        <group position={[0.45, 0.1, 0]} rotation={[0, 0, 0.8]}>
          <mesh>
            <boxGeometry args={[0.12, 0.4, 0.12]} />
            <meshStandardMaterial color={ch.panic.shirt} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={ch.panic.skin} />
          </mesh>
        </group>
      </>
    );
  }

  // Normal arms at sides
  return (
    <>
      <mesh position={[-0.5, -0.3, 0]}>
        <boxGeometry args={[0.12, 0.38, 0.12]} />
        <meshStandardMaterial color={ch.normal.shirt} />
      </mesh>
      <mesh position={[-0.5, -0.55, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={ch.normal.skin} />
      </mesh>
      <mesh position={[0.5, -0.3, 0]}>
        <boxGeometry args={[0.12, 0.38, 0.12]} />
        <meshStandardMaterial color={ch.normal.shirt} />
      </mesh>
      <mesh position={[0.5, -0.55, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={ch.normal.skin} />
      </mesh>
    </>
  );
}

function AuraRing({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 8, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} />
    </mesh>
  );
}

function LightningBolts() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.elapsedTime * 2;
    groupRef.current.children.forEach((child, i) => {
      child.visible = Math.sin(clock.elapsedTime * 8 + i * 2) > 0;
    });
  });

  return (
    <group ref={groupRef} position={[0, 0.2, 0]}>
      {[0, 1, 2].map((i) => {
        const angle = (i * Math.PI * 2) / 3;
        const x = Math.cos(angle) * 0.6;
        const z = Math.sin(angle) * 0.6;
        return (
          <Billboard key={i} position={[x, 0, z]}>
            <Text fontSize={0.15} color={psyduck.body}>
              {'\u26A1'}
            </Text>
          </Billboard>
        );
      })}
    </group>
  );
}
