import { useFrame } from '@react-three/fiber';
import { useTrait, useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';
import { Level } from '@/sim/world';
import { type EmergentControls as ControlsRig, createEmergentControls } from '../emergent-controls';

interface EmergentControlsProps {
  /** Platter rim radius to orbit along (matches industrial-platter's rim). */
  rimRadius?: number;
  /** Base Y position (platter rim surface). */
  rimY?: number;
  /** Seconds for all controls to fully emerge (staggered). */
  emergeDurationSeconds?: number;
  /** Stagger between successive controls. */
  staggerSeconds?: number;
}

/**
 * EmergentControls — level-parameterized input system.
 *
 * Reads the Level trait's inputSchema and builds matching controls that
 * extrude through machined slits in the platter rim. The schema is
 * arbitrary in length and kind — pattern-match keycaps, push/pull handles,
 * sequence keys, sliders, or any mix.
 *
 * Rebuilds the rig whenever the schema reference changes (level start /
 * level transition). Emergence animation kicks in immediately on build.
 */
export default function EmergentControls({
  rimRadius = 1.45,
  rimY = 0.2,
  emergeDurationSeconds = 1.6,
  staggerSeconds = 0.12,
}: EmergentControlsProps) {
  const world = useWorld();
  const level = useTrait(world, Level);
  const groupRef = useRef<Group>(null);
  const rigRef = useRef<ControlsRig | null>(null);
  const emergeFnRef = useRef<((elapsed: number) => boolean) | null>(null);
  const emergeStartRef = useRef<number>(0);

  const schema = level?.inputSchema ?? [];

  // Re-build the rig whenever the schema reference changes.
  useEffect(() => {
    if (!groupRef.current || schema.length === 0) return;

    const fakeScene = groupRef.current as unknown as Parameters<typeof createEmergentControls>[0];
    const rig = createEmergentControls(fakeScene, {
      schema,
      rimRadius,
      rimY,
    });
    rigRef.current = rig;
    emergeFnRef.current = rig.emerge(emergeDurationSeconds, staggerSeconds);
    emergeStartRef.current = performance.now() / 1000;

    return () => {
      rig.dispose();
      rigRef.current = null;
      emergeFnRef.current = null;
    };
  }, [schema, rimRadius, rimY, emergeDurationSeconds, staggerSeconds]);

  useFrame(() => {
    if (!emergeFnRef.current) return;
    const elapsed = performance.now() / 1000 - emergeStartRef.current;
    const done = emergeFnRef.current(elapsed);
    if (done) emergeFnRef.current = null;
  });

  return <group ref={groupRef} />;
}
