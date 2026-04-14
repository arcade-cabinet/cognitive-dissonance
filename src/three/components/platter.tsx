import { useFrame } from '@react-three/fiber';
import { useTrait, useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, MathUtils } from 'three';
import { Level } from '@/sim/world';
import { createIndustrialPlatter, type IndustrialPlatter } from '../industrial-platter';

/**
 * Platter — the heavy industrial disc the sphere sits on.
 *
 * Uses `createIndustrialPlatter()` (ported from research/). Subscribes to
 * Koota's Level trait to drive rim emissive intensity from current tension.
 * Rotation + wobble are driven by level.rotation and level.wobble fields
 * (set to default values here until the Level trait schema is extended in
 * Phase 3).
 */
export default function Platter() {
  const world = useWorld();
  const level = useTrait(world, Level);
  const groupRef = useRef<Group>(null);
  const platterRef = useRef<IndustrialPlatter | null>(null);

  // Build the platter once; subscribe into the group on mount.
  // The helper expects a scene — we give it a disposable detached scene-like
  // object via a child group; R3F parents it for us.
  useEffect(() => {
    if (!groupRef.current) return;
    // industrial-platter attaches its internal group to `scene` — we emulate
    // that by passing a child group as the "scene" it adds to.
    const fakeScene = groupRef.current as unknown as Parameters<typeof createIndustrialPlatter>[0];
    platterRef.current = createIndustrialPlatter(fakeScene);
    return () => {
      platterRef.current?.dispose();
      platterRef.current = null;
    };
  }, []);

  // Tension drives rim emissive.
  useEffect(() => {
    platterRef.current?.setTension(level?.tension ?? 0);
  }, [level?.tension]);

  // Rotation speed + wobble amplitude (defaults — Phase 3 moves to Level trait)
  const { rotationSpeed, wobbleAmp } = useMemo(
    () => ({
      rotationSpeed: 0.165, // rad/sec default from the old Babylon platter
      wobbleAmp: 0.04,
    }),
    [],
  );

  useFrame((_state, dt) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += rotationSpeed * dt;

    // Tension-driven wobble — quadratic coupling so low tension stays still,
    // crisis shakes hard.
    const tension = level?.tension ?? 0;
    const amp = wobbleAmp * tension * tension;
    const t = performance.now() / 1000;
    groupRef.current.rotation.x = Math.sin(t * 1.7) * amp;
    groupRef.current.rotation.z = Math.cos(t * 1.3) * amp;

    // Clamp so extreme tension doesn't flip the platter visibly.
    groupRef.current.rotation.x = MathUtils.clamp(groupRef.current.rotation.x, -0.12, 0.12);
    groupRef.current.rotation.z = MathUtils.clamp(groupRef.current.rotation.z, -0.12, 0.12);
  });

  return <group ref={groupRef} position={[0, -1.6, 0]} />;
}
