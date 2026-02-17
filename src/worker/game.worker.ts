import type { MainMessage, WorkerMessage } from '../lib/events';
import { GameLogic } from '../lib/game-logic';

const logic = new GameLogic();
let running = false;
let lastTime = 0;
let animationFrameId: number | undefined;

// Polyfill for requestAnimationFrame in worker if needed
// Must bind to self to avoid "Illegal invocation" errors in some environments
// Force setTimeout to ensure reliable execution in CI/Headless environments
const requestFrame = (callback: (t: number) => void) =>
  setTimeout(() => callback(performance.now()), 16);

const cancelFrame = clearTimeout;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const msg = e.data;
    switch (msg.type) {
      case 'START':
        if (animationFrameId !== undefined) {
          cancelFrame(animationFrameId);
        }
        running = true;
        if (msg.endless) {
          logic.startEndlessMode();
        } else {
          logic.start(msg.seed);
        }
        lastTime = performance.now();
        scheduleLoop();
        break;
      case 'PAUSE':
        running = false;
        if (animationFrameId !== undefined) {
          cancelFrame(animationFrameId);
        }
        break;
      case 'RESUME':
        if (!running) {
          running = true;
          lastTime = performance.now();
          scheduleLoop();
        }
        break;
      case 'INPUT':
        if (msg.key === '1') logic.triggerAbility('reality');
        else if (msg.key === '2') logic.triggerAbility('history');
        else if (msg.key === '3') logic.triggerAbility('logic');
        else if (msg.key === 'q' || msg.key === 'Q') logic.triggerNuke();
        break;
      case 'ABILITY':
        logic.triggerAbility(msg.ability);
        break;
      case 'NUKE':
        logic.triggerNuke();
        break;
      case 'CLICK': {
        const enemy = logic.findEnemyAt(msg.x, msg.y);
        if (enemy && !enemy.encrypted) {
          logic.triggerAbility(enemy.type.counter);
        }
        break;
      }
      case 'TERMINATE':
        running = false;
        if (animationFrameId !== undefined) {
          cancelFrame(animationFrameId);
        }
        self.close();
        return;
    }
  } catch (err) {
    handleError(err);
  }
};

function scheduleLoop() {
  animationFrameId = requestFrame(loop) as number;
}

function loop(now: number) {
  if (!running) return;

  try {
    const dt = Math.min((now - lastTime) / 16.67, 2); // Frame time factor (approx 1.0 at 60fps)
    lastTime = now;

    logic.update(dt, now);
    const state = logic.getState();

    const msg: MainMessage = { type: 'STATE', state };
    self.postMessage(msg);

    if (logic.running) {
      scheduleLoop();
    } else {
      running = false;
    }
  } catch (err) {
    handleError(err);
  }
}

function handleError(err: unknown) {
  running = false;
  if (animationFrameId !== undefined) {
    cancelFrame(animationFrameId);
  }
  console.error('[game.worker] Unhandled error:', err);
  const errorMsg: MainMessage = {
    type: 'ERROR',
    message: err instanceof Error ? err.message : String(err),
  };
  self.postMessage(errorMsg);
}
