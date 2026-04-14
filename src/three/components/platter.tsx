import { useFrame } from '@react-three/fiber';
import { useTrait, useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import { type Group, MathUtils } from 'three';
import { Level } from '@/sim/world';
import { createIndustrialPlatter, type IndustrialPlatter } from '../industrial-platter';

/**
 * Platter — the heavy industrial disc the sphere sits on.
 *
 * Uses `createIndustrialPlatter()` (ported from research/). Subscribes to
 * Koota's Level trait to drive rim emissive intensity from current tension.
 *
 * Rotation direction + speed come from level.rotation; wobble amplitude
 * comes from level.wobble (tilt scales with tension^tensionCoupling so
 * low tension is stable, crisis shakes hard).
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

  useFrame((_state, dt) => {
    if (!groupRef.current) return;
    const rotation = level?.rotation ?? { direction: 1, speedRad: 0.165 };
    const wobble = level?.wobble ?? { maxTiltRad: 0.12, tensionCoupling: 2.0 };
    const tension = level?.tension ?? 0;

    groupRef.current.rotation.y += rotation.direction * rotation.speedRad * dt;

    // Tension-coupled wobble. coupling=2 → quadratic; coupling=1 → linear.
    // Amplitude is capped by maxTiltRad so runaway tension can't flip the disc.
    const couplingPower = Math.max(0.5, wobble.tensionCoupling);
    const amp = wobble.maxTiltRad * 0.5 * tension ** couplingPower;
    const t = performance.now() / 1000;
    groupRef.current.rotation.x = MathUtils.clamp(
      Math.sin(t * 1.7) * amp,
      -wobble.maxTiltRad,
      wobble.maxTiltRad,
    );
    groupRef.current.rotation.z = MathUtils.clamp(
      Math.cos(t * 1.3) * amp,
      -wobble.maxTiltRad,
      wobble.maxTiltRad,
    );
  });

  return <group ref={groupRef} position={[0, -1.6, 0]} />;
}
