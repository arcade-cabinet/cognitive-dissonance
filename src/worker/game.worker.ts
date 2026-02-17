import type { MainMessage, WorkerMessage } from '../lib/events';
import { GameLogic } from '../lib/game-logic';

let logic: GameLogic;
let running = false;
let lastTime = 0;
let animationFrameId: number | undefined;

try {
  logic = new GameLogic();
  // Signal ready
  const readyMsg: MainMessage = { type: 'READY' };
  self.postMessage(readyMsg);
} catch (err) {
  console.error('[game.worker] Initialization failed:', err); // NOSONAR
  const errorMsg: MainMessage = {
    type: 'ERROR',
    message: err instanceof Error ? err.message : String(err),
  };
  self.postMessage(errorMsg);
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (!logic) return; // Prevent crash if init failed

  try {
    const msg = e.data;
    switch (msg.type) {
      case 'START':
        if (animationFrameId !== undefined) {
          clearTimeout(animationFrameId);
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
          clearTimeout(animationFrameId);
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
          clearTimeout(animationFrameId);
        }
        self.close();
        return;
    }
  } catch (err) {
    running = false;
    if (animationFrameId !== undefined) {
      clearTimeout(animationFrameId);
    }
    console.error('[game.worker] Unhandled error in message handler:', err); // NOSONAR
    const errorMsg: MainMessage = {
      type: 'ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorMsg);
  }
};

function scheduleLoop() {
  animationFrameId = setTimeout(() => loop(performance.now()), 16) as unknown as number;
}

function loop(now: number) {
  if (!running) return;

  // Use relaxed clamping (60 = 1s) for CI/slow environments to prevent time dilation
  const dt = Math.min((now - lastTime) / 16.67, 60);
  lastTime = now;

  try {
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
    console.error('[game.worker] Error in game loop:', err); // NOSONAR
    running = false;
    const errorMsg: MainMessage = {
      type: 'ERROR',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorMsg);
  }
}
