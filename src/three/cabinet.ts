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

import RAPIER from '@dimforge/rapier3d';
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
import { Input, Level } from '@/sim/world';
import { type AICore, createAICore } from './ai-core';
import { createEmergentControls, type EmergentControls } from './emergent-controls';
import { createIndustrialPlatter, type IndustrialPlatter } from './industrial-platter';
import { createPatternTrails, type PatternTrails } from './pattern-trails';
import { CorruptionEffect } from './post-process-corruption';
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

  const camera = new PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 1.8, 4.8);
  camera.lookAt(0, -0.2, 0);

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
  const physics = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
  physics.timestep = 1 / 60;
  physics.numSolverIterations = 4;

  // Ground plane just below the platter so runaway bodies hit something
  // and we can cull them (instead of falling forever through the void).
  const floorBody = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -3, 0));
  physics.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.1, 20).setRestitution(0.05), floorBody);

  // ── Cabinet pieces ─────────────────────────────────────────────────────
  const platter = createIndustrialPlatter(scene, {
    position: new Vector3(0, -1.6, 0),
  });
  const aiCore = createAICore(scene, {
    outerRadius: 0.6,
    position: new Vector3(0, 0.4, 0),
  });
  const skyRain = createSkyRain(scene, { count: 160 });
  const patternTrails = createPatternTrails(scene, kootaWorld);

  const initialSchema = kootaWorld.get(Level)?.inputSchema ?? [];
  let emergentControls = createEmergentControls(scene, {
    schema: initialSchema,
    rimRadius: 1.45,
    rimY: platter.group.position.y + 0.2,
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
  let physicsAccumulator = 0;

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
      rimY: platter.group.position.y + 0.2,
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

    // Step physics at a fixed 60Hz regardless of render fps.
    // dt from rAF fluctuates; accumulate it and fire discrete substeps.
    physicsAccumulator += dt;
    const maxSubsteps = 5;
    let steps = 0;
    while (physicsAccumulator >= physics.timestep && steps < maxSubsteps) {
      physics.step();
      physicsAccumulator -= physics.timestep;
      steps++;
    }
    if (physicsAccumulator > physics.timestep * maxSubsteps) {
      // We're falling way behind; drop the backlog rather than spiral.
      physicsAccumulator = 0;
    }

    // Nebula interior animation (skipped under reduced-motion).
    if (!reducedMotion) aiCore.update(dt);

    // Sky rain update (uses its own internal integration; will migrate to
    // rapier bodies in a follow-up so the visual sim and physics sim agree).
    skyRain.update(dt, tension);

    // Pattern trails — read Koota pattern entities and draw.
    patternTrails.update();

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
    physics.free();
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
    getEmergentControls: () => emergentControls,
    corruption,
    render,
    resize,
    rebuildControls,
    dispose,
  };
}
