/**
 * Input listeners — keyboard + pointer + touch.
 *
 * Translates DOM events into Koota `Input` trait mutations. Each pressed
 * keycap (identified by index into Level.inputSchema) gets added to the
 * `heldKeycaps` Set; released ones get removed. The cabinet renderer reads
 * this every frame to drive the per-control press travel.
 *
 * Mapping:
 *   - Digit keys 1..9,0,-,= → control indices 0..11 (first 12 slots)
 *     Extra Number keys map to higher indices if the schema is longer.
 *   - Pointer hits on control meshes → corresponding control index
 *     (raycast resolves the slot).
 *
 * No framework. Raw `addEventListener`. Returns an unmount fn that removes
 * every listener for clean Capacitor re-entry.
 */

import type { World } from 'koota';
import { Input, Level } from '@/sim/world';

export interface InputOptions {
  world: World;
  canvas: HTMLCanvasElement;
}

/**
 * Keyboard ordinal → index mapping. We want natural keyboard order:
 *   Row 1: 1 2 3 4 5 6 7 8 9 0 - =
 * giving indices 0..11 for a standard 12-slot pattern schema.
 * Longer schemas overflow to q w e r t y u i o p [ ] (indices 12..23).
 */
const KEY_ORDER = [
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6',
  'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal',
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY',
  'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight',
];

export function mountInputListeners(opts: InputOptions): () => void {
  const { world, canvas } = opts;

  function press(index: number): void {
    world.set(Input, (prev) => {
      const heldKeycaps = new Set(prev.heldKeycaps);
      heldKeycaps.add(index);
      return { ...prev, heldKeycaps };
    });
  }
  function release(index: number): void {
    world.set(Input, (prev) => {
      const heldKeycaps = new Set(prev.heldKeycaps);
      heldKeycaps.delete(index);
      return { ...prev, heldKeycaps };
    });
  }

  function keyDown(ev: KeyboardEvent): void {
    if (ev.repeat) return;
    const i = KEY_ORDER.indexOf(ev.code);
    if (i < 0) return;
    const schema = world.get(Level)?.inputSchema;
    if (!schema || i >= schema.length) return;
    press(i);
  }

  function keyUp(ev: KeyboardEvent): void {
    const i = KEY_ORDER.indexOf(ev.code);
    if (i < 0) return;
    release(i);
  }

  // Pointer hits on control meshes require a raycast from camera through
  // the cursor position. The cabinet module owns the scene + camera + raycaster
  // and reads `heldKeycaps` — but the raycast itself needs access to those.
  // For Phase 1 we only wire keyboard; pointer + touch will land next.

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);

  // Prevent default pointer behavior on the canvas (no text-selection
  // drag, no scroll) without blocking the raycast wiring to follow.
  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';

  return function unmount() {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
  };
}
