/**
 * Cognitive Dissonance v4 entry point.
 *
 * No UI framework. Plain TS + DOM. The cabinet renders into a single
 * full-window <canvas>; the only overlay is a brief "INITIALIZING CORE"
 * boot splash that cross-fades out on first WebGL frame.
 *
 * Everything else (tension, palette shift, keycap emergence, sky rain,
 * post-process escalation) is diegetic — on the three.js scene.
 */

import { setPhase, setTension } from '@/sim/actions';
import { createPatternStabilizerState, tickPatternStabilizer } from '@/sim/systems/pattern-stabilizer';
import { tickTensionDriver } from '@/sim/systems/tension-driver';
import { Level, world } from '@/sim/world';
import { createAudioEngine, mountFirstGestureAudio } from './boot/audio';
import { mountBootOverlay } from './boot/boot-overlay';
import { mountGameOverHandler } from './boot/game-over';
import { mountInputListeners } from './boot/input';
import { createCabinet } from './three/cabinet';
import './styles.css';

async function mount(): Promise<void> {
  const root = document.getElementById('root');
  if (!root) throw new Error('#root element not found in index.html');

  // Boot overlay first — it covers the black WebGL canvas while we compile
  // shaders, compute PMREM, and fire up the first render.
  const overlay = mountBootOverlay(root);

  // Full-window canvas.
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  canvas.setAttribute('aria-label', 'Cognitive Dissonance game canvas');
  root.appendChild(canvas);

  // Size the canvas to fill the root element before the cabinet boots.
  resizeCanvas(canvas, root);

  const cabinet = await createCabinet({
    canvas,
    world,
    reducedMotion: prefersReducedMotion(),
  });

  // ── Input (keyboard + pointer-raycast)
  const unmountInput = mountInputListeners({
    world,
    canvas,
    camera: cabinet.camera,
    getControls: cabinet.getEmergentControls,
  });

  // ── Audio (lazy-init on first gesture)
  const audio = createAudioEngine(world);
  const detachFirstGesture = mountFirstGestureAudio(audio);

  // ── Game-over / restart handler
  const unmountGameOver = mountGameOverHandler({ world });

  // ── Resize
  const ro =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          resizeCanvas(canvas, root);
          cabinet.resize(canvas.clientWidth, canvas.clientHeight);
        })
      : null;
  ro?.observe(root);
  window.addEventListener('orientationchange', () => {
    resizeCanvas(canvas, root);
    cabinet.resize(canvas.clientWidth, canvas.clientHeight);
  });

  // ── Sim state
  const stabilizer = createPatternStabilizerState();

  // Transition to playing phase on first frame — the cabinet IS the menu,
  // so there's no separate title state. Keycap emergence handles the
  // "this is a new game" cue.
  setPhase('playing');

  // ── Render loop
  let last = performance.now();
  let firstFrame = true;
  function frame(now: number): void {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    tickPatternStabilizer(world, stabilizer, dt);
    tickTensionDriver(world, dt);
    cabinet.render(dt);
    if (firstFrame) {
      firstFrame = false;
      overlay.fadeOut();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ── E2E + dev-tools bridge on window.
  // Exposed unconditionally because this is a client-side-only game — there's
  // no sensitive state to hide. Keeps Playwright tests working against both
  // `pnpm dev` and `pnpm preview` (which doesn't set import.meta.env.DEV).
  interface Bridge {
    __world?: typeof world;
    __cabinet?: typeof cabinet;
    __setTension?: typeof setTension;
    __getLevel?: () => ReturnType<typeof world.get<typeof Level>>;
    __fireGameOver?: () => void;
  }
  const bridge = window as Window & Bridge;
  bridge.__world = world;
  bridge.__cabinet = cabinet;
  bridge.__setTension = setTension;
  bridge.__getLevel = () => world.get(Level);
  bridge.__fireGameOver = () => {
    window.dispatchEvent(new CustomEvent('gameOver'));
  };

  // Teardown on page unload — Capacitor keeps this process alive, so we
  // clean up properly to avoid GPU resource leaks on swipe-home.
  window.addEventListener('pagehide', () => {
    detachFirstGesture();
    unmountGameOver();
    audio.dispose();
    unmountInput();
    ro?.disconnect();
    cabinet.dispose();
  });
}

function resizeCanvas(canvas: HTMLCanvasElement, root: HTMLElement): void {
  const w = root.clientWidth || window.innerWidth;
  const h = root.clientHeight || window.innerHeight;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

mount().catch((err) => {
  console.error('[boot] cabinet failed to mount', err);
});
