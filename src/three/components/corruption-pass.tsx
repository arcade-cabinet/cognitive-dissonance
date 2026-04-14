import { useFrame, useThree } from '@react-three/fiber';
import { useTrait, useWorld } from 'koota/react';
import { EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { useEffect, useRef } from 'react';
import { Level } from '@/sim/world';
import { CorruptionEffect } from '../post-process-corruption';

/**
 * CorruptionPass — full-screen chromatic aberration / noise / vignette /
 * scanlines effect layered on top of the rendered scene.
 *
 * Implements R3F's render-take-over pattern: we own an EffectComposer and
 * replace R3F's default renderer invocation via setFrameloop + custom
 * render fn. The composer renders the scene THEN applies the corruption
 * effect.
 *
 * Tension from Koota drives the effect intensity.
 */
export default function CorruptionPass() {
  const { gl, scene, camera, size } = useThree();
  const world = useWorld();
  const level = useTrait(world, Level);
  const composerRef = useRef<EffectComposer | null>(null);
  const effectRef = useRef<CorruptionEffect | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));

    const effect = new CorruptionEffect({ tension: 0, time: 0 });
    composer.addPass(new EffectPass(camera, effect));

    composerRef.current = composer;
    effectRef.current = effect;

    return () => {
      composer.dispose();
      composerRef.current = null;
      effectRef.current = null;
    };
  }, [gl, scene, camera]);

  // Keep composer size in sync with the canvas
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size.width, size.height]);

  // Drive tension into the effect uniform
  useEffect(() => {
    if (effectRef.current) {
      effectRef.current.tension = level?.tension ?? 0;
    }
  }, [level?.tension]);

  // Render through the composer every frame, at priority 1 so it runs after
  // all the scene updates. Returning non-zero priority means R3F hands over
  // render control to us.
  useFrame((_state, dt) => {
    if (effectRef.current) effectRef.current.time += dt;
    composerRef.current?.render(dt);
  }, 1);

  return null;
}
