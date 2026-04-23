/**
 * Cabinet — the single-scene procedural game board.
 *
 * Creates:
 *   - Three.js renderer + scene + camera + lights + PMREM environment
 *   - Rapier physics world (rigid bodies for platter, sphere, rain, keycaps)
 *   - All cabinet pieces (platter, AI sphere, sky rain, emergent controls,
 *     post-process corruption)
 *   - Render loop driven by requestAnimationFrame in main.ts
 *
 * Subscribes to Koota traits so tension, input schema, rotation, and wobble
 * flow from the game sim into the right subsystem every frame.
 *
 * Framework-agnostic. Consumed by src/main.ts which owns the canvas.
 */

import type RAPIER from '@dimforge/rapier3d';
import type { World as KootaWorld } from 'koota';
import { EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three-stdlib';
import { Game, Input, Level } from '@/sim/world';
import { type AICore, createAICore } from './ai-core';
import { createEmergentControls, type EmergentControls } from './emergent-controls';
import { createIndustrialPlatter, type IndustrialPlatter } from './industrial-platter';
import { createPatternTrails, type PatternTrails } from './pattern-trails';
import { type CabinetPhysics, createCabinetPhysics, SPHERE_RADIUS, SPHERE_Y } from './physics-setup';
import { CorruptionEffect } from './post-process-corruption';
import { createShatter, type Shatter } from './shatter';
import { createSkyRain, type SkyRain } from './sky-rain';

export interface CabinetOptions {
  canvas: HTMLCanvasElement;
  world: KootaWorld;
  reducedMotion?: boolean;
}

export interface Cabinet {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  physics: RAPIER.World;
  platter: IndustrialPlatter;
  aiCore: AICore;
  skyRain: SkyRain;
  patternTrails: PatternTrails;
  shatter: Shatter;
  /**
   * Current emergent-controls rig. Accessor (not bare property) because the
   * internal reference is swapped when Level.inputSchema changes — callers
   * must always fetch the live instance, not hold on to a stale one.
   */
  getEmergentControls(): EmergentControls;
  corruption: CorruptionEffect;
  /** Advance one frame (renders + steps physics). Called from rAF. */
  render(deltaSeconds: number): void;
  /** Resize canvas/camera/composer. */
  resize(width: number, height: number): void;
  /** Rebuild the input rig from current Level.inputSchema. */
  rebuildControls(): void;
  dispose(): void;
}

/**
 * Builds every cabinet piece and returns a render function.
 *
 * Async because rapier's WASM module resolves at import time via
 * vite-plugin-wasm (see vite.config.ts). The top-level-await plugin
 * lets the WASM binding be ready by the time we touch RAPIER.* APIs.
 */
export async function createCabinet(opts: CabinetOptions): Promise<Cabinet> {
  const { canvas, world: kootaWorld, reducedMotion = false } = opts;

  // ── Three renderer / scene / camera ────────────────────────────────────
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  const w = canvas.clientWidth || 1280;
  const h = canvas.clientHeight || 800;
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  scene.background = new Color(0x0a0a0f);

  // Camera framing: classic arcade-cabinet three-quarter view. Low enough
  // that the near half of the rim reads as a tall band (with etched text
  // legible), elevated enough that you still see the top surface of the
  // disc and the emerging keycaps. The sphere dominates the upper half
  // of the frame.
  //   - ~1.9m above the platter top surface
  //   - ~5.2m back (more breathing room)
  //   - Aimed slightly below the sphere so the rim text + platter top are
  //     both visible with the sphere dominating the upper half.
  const camera = new PerspectiveCamera(38, w / h, 0.1, 100);
  camera.position.set(0, 1.9, 5.2);
  camera.lookAt(0, 0.1, 0);

  // PMREM environment — procedural, no network.
  const pmrem = new PMREMGenerator(renderer);
  const envScene = RoomEnvironment();
  const envTex = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envTex;

  // Lights
  const hemi = new HemisphereLight(0xbbccff, 0x080810, 0.35);
  scene.add(hemi);
  const keyLight = new DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(3, 5, 2);
  scene.add(keyLight);
  const rimLight = new PointLight(0x4080cc, 8, 15);
  rimLight.position.set(0, 2, 3);
  scene.add(rimLight);

  // ── Rapier physics world ───────────────────────────────────────────────
  // Owns the world, the static colliders (platter top + AI sphere with
  // contact-event flag), the event queue, and the substep accumulator.
  // step(dt) returns the number of impacts that hit the sphere this frame.
  const physicsRig: CabinetPhysics = createCabinetPhysics();
  const physics = physicsRig.world;
  let pendingSphereImpacts = 0;

  // ── Cabinet pieces ─────────────────────────────────────────────────────
  const platter = createIndustrialPlatter(scene, {
    position: new Vector3(0, -1.6, 0),
  });
  const aiCore = createAICore(scene, {
    outerRadius: SPHERE_RADIUS,
    position: new Vector3(0, SPHERE_Y, 0),
  });
  const skyRain = createSkyRain(scene, physics, {
    count: 160,
    // Recycle particles that bounce/roll off the platter. Platter top sits
    // at -1.45; give a half-meter grace before culling.
    floorY: -2.0,
  });
  const patternTrails = createPatternTrails(scene, kootaWorld);
  const shatter = createShatter(scene, physics, { origin: new Vector3(0, SPHERE_Y, 0) });

  // Listen for the gameOver event (dispatched by the tension driver). When
  // coherence hits zero we detonate the shatter pool and hide the intact
  // AI core so the shards are visibly replacing the glass sphere.
  let isShattered = false;
  function onGameOver(): void {
    if (isShattered) return;
    isShattered = true;
    aiCore.outerMesh.visible = false;
    aiCore.innerMesh.visible = false;
    shatter.explode();
  }
  // Bundled with `gameover` phase change in the sim; the DOM event fires
  // slightly earlier than the world state update (same frame). We listen
  // to the DOM event for immediate reaction.
  window.addEventListener('gameOver', onGameOver);

  const initialSchema = kootaWorld.get(Level)?.inputSchema ?? [];
  // Parent controls to the platter so they inherit rotation + wobble.
  // rimY is now local to the platter's origin (was world-space when scene-parented).
  let emergentControls = createEmergentControls(scene, {
    schema: initialSchema,
    rimRadius: 1.45,
    rimY: 0.2,
    parent: platter.group,
  });
  let emergeFn: ((elapsed: number) => boolean) | null = emergentControls.emerge(1.6, 0.12);
  let emergeStart = performance.now() / 1000;

  // ── Postprocessing ─────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const corruption = new CorruptionEffect({ tension: 0, time: 0 });
  composer.addPass(new EffectPass(camera, corruption));
  composer.setSize(w, h);

  // ── Change tracking ────────────────────────────────────────────────────
  let lastSchema: unknown = initialSchema;

  function applyTension(tension: number): void {
    platter.setTension(tension);
    aiCore.setTension(tension);
    corruption.tension = tension;
  }

  function rebuildControls(): void {
    emergentControls.dispose();
    const schema = kootaWorld.get(Level)?.inputSchema ?? [];
    emergentControls = createEmergentControls(scene, {
      schema,
      rimRadius: 1.45,
      rimY: 0.2,
      parent: platter.group,
    });
    emergeFn = emergentControls.emerge(1.6, 0.12);
    emergeStart = performance.now() / 1000;
  }

  // ── Render loop body ───────────────────────────────────────────────────
  function render(dt: number): void {
    const level = kootaWorld.get(Level);
    const tension = level?.tension ?? 0;
    applyTension(tension);

    // Level transitions rebuild the rig.
    if (level?.inputSchema && level.inputSchema !== lastSchema) {
      lastSchema = level.inputSchema;
      rebuildControls();
    }

    // Platter rotation + tension-coupled wobble.
    const rotation = level?.rotation ?? { direction: 1, speedRad: 0.165 };
    const wobble = level?.wobble ?? { maxTiltRad: 0.12, tensionCoupling: 2.0 };
    platter.group.rotation.y += rotation.direction * rotation.speedRad * dt;
    const couplingPower = Math.max(0.5, wobble.tensionCoupling);
    const amp = wobble.maxTiltRad * 0.5 * tension ** couplingPower;
    const tNow = performance.now() / 1000;
    platter.group.rotation.x = MathUtils.clamp(Math.sin(tNow * 1.7) * amp, -wobble.maxTiltRad, wobble.maxTiltRad);
    platter.group.rotation.z = MathUtils.clamp(Math.cos(tNow * 1.3) * amp, -wobble.maxTiltRad, wobble.maxTiltRad);

    // Step physics at a fixed 60Hz regardless of render fps. The rig owns
    // the substep accumulator + event drain; we just collect the impact count.
    pendingSphereImpacts += physicsRig.step(dt);

    // Apply accumulated sphere impacts. Each impact nudges tension up
    // slightly — watching a rain cube hit the glass should *feel* like it
    // matters. Cap per-frame application so a pile-up doesn't saturate.
    if (pendingSphereImpacts > 0) {
      const bump = Math.min(pendingSphereImpacts, 5) * 0.018;
      kootaWorld.set(Level, (prev) => ({
        ...prev,
        tension: Math.min(1, prev.tension + bump),
      }));
      pendingSphereImpacts = 0;
    }

    // Nebula interior animation (skipped under reduced-motion).
    if (!reducedMotion) aiCore.update(dt);

    // Sky rain update (uses its own internal integration; will migrate to
    // rapier bodies in a follow-up so the visual sim and physics sim agree).
    skyRain.update(dt, tension);

    // Pattern trails — read Koota pattern entities and draw.
    patternTrails.update();

    // Shatter — only pushes body transforms when exploded. If the sim
    // restart handler has moved us back to 'playing' after a shatter,
    // restore the intact sphere. We check every frame instead of relying
    // on a transition edge so programmatic resets via __fireGameOver that
    // never set phase=gameover still recover cleanly.
    shatter.update();
    const phaseNow = kootaWorld.get(Game)?.phase;
    if (phaseNow === 'playing' && isShattered) {
      isShattered = false;
      shatter.reset();
      aiCore.outerMesh.visible = true;
      aiCore.innerMesh.visible = true;
    }

    // Emergent controls staggered emerge.
    if (emergeFn) {
      const elapsed = tNow - emergeStart;
      const done = emergeFn(elapsed);
      if (done) emergeFn = null;
    }

    // Reflect Input.heldKeycaps on the control rig — pressed keycaps
    // dip down + brighten, released ones return to rest.
    const heldSet = kootaWorld.get(Input)?.heldKeycaps;
    for (let i = 0; i < emergentControls.controls.length; i++) {
      emergentControls.setPressed(i, heldSet?.has(i) ? 1 : 0);
    }

    // Advance corruption time uniform and render through composer.
    corruption.time += dt;
    composer.render(dt);
  }

  function resize(width: number, height: number): void {
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function dispose(): void {
    window.removeEventListener('gameOver', onGameOver);
    shatter.dispose();
    patternTrails.dispose();
    emergentControls.dispose();
    skyRain.dispose();
    aiCore.dispose();
    platter.dispose();
    composer.dispose();
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
    scene.remove(hemi, keyLight, rimLight);
    physicsRig.dispose();
  }

  return {
    renderer,
    scene,
    camera,
    physics,
    platter,
    aiCore,
    skyRain,
    patternTrails,
    shatter,
    getEmergentControls: () => emergentControls,
    corruption,
    render,
    resize,
    rebuildControls,
    dispose,
  };
}
