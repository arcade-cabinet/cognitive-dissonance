import { GameLogic } from '../lib/game-logic';
const logic = new GameLogic();
let running = false;
let lastTime = 0;
let animationFrameId;
// Polyfill for requestAnimationFrame in worker if needed
const requestFrame = self.requestAnimationFrame ||
    ((callback) => setTimeout(() => callback(performance.now()), 16));
const cancelFrame = self.cancelAnimationFrame || clearTimeout;
self.onmessage = (e) => {
    const msg = e.data;
    switch (msg.type) {
        case 'START':
            running = true;
            if (msg.endless) {
                logic.startEndlessMode();
            }
            else {
                logic.start();
            }
            lastTime = performance.now();
            scheduleLoop();
            break;
        case 'PAUSE':
            running = false;
            cancelFrame(animationFrameId);
            break;
        case 'RESUME':
            if (!running) {
                running = true;
                lastTime = performance.now();
                scheduleLoop();
            }
            break;
        case 'INPUT':
            if (msg.key === '1')
                logic.triggerAbility('reality');
            else if (msg.key === '2')
                logic.triggerAbility('history');
            else if (msg.key === '3')
                logic.triggerAbility('logic');
            else if (msg.key === 'q' || msg.key === 'Q')
                logic.triggerNuke();
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
    }
};
function scheduleLoop() {
    animationFrameId = requestFrame(loop);
}
function loop(now) {
    if (!running)
        return;
    const dt = Math.min((now - lastTime) / 16.67, 2); // Frame time factor (approx 1.0 at 60fps)
    lastTime = now;
    logic.update(dt, now);
    const state = logic.getState();
    const msg = { type: 'STATE', state };
    self.postMessage(msg);
    if (logic.running) {
        scheduleLoop();
    }
    else {
        running = false;
    }
}
