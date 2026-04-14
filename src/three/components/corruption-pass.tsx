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
 * Pattern: useFrame at priority 1 takes over R3F's rendering. An
 * EffectComposer owns the pipeline (RenderPass renders the scene into an
 * internal target, then EffectPass applies corruption). Until the composer
 * initializes on the next effect flush, we fall back to a direct
 * renderer.render(scene, camera) so the first frame isn't black.
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

    composer.setSize(size.width, size.height);

    composerRef.current = composer;
    effectRef.current = effect;

    return () => {
      composer.dispose();
      composerRef.current = null;
      effectRef.current = null;
    };
  }, [gl, scene, camera, size.width, size.height]);

  // Drive tension into the effect uniform whenever it changes.
  useEffect(() => {
    if (effectRef.current) {
      effectRef.current.tension = level?.tension ?? 0;
    }
  }, [level?.tension]);

  // Priority 1 means R3F hands rendering to us. If the composer isn't ready
  // yet (first frame before the init effect runs), fall back to a direct
  // render so the screen isn't black.
  useFrame((_state, dt) => {
    const composer = composerRef.current;
    const effect = effectRef.current;
    if (effect) effect.time += dt;
    if (composer) {
      composer.render(dt);
    } else {
      gl.render(scene, camera);
    }
  }, 1);

  return null;
}
