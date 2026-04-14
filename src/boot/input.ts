/**
 * Input listeners — keyboard + pointer + touch.
 *
 * Translates DOM events into Koota `Input` trait mutations. Each pressed
 * keycap (identified by index into Level.inputSchema) gets added to the
 * `heldKeycaps` Set; released ones get removed. The cabinet renderer reads
 * this every frame to drive the per-control press travel.
 *
 * Mapping:
 *   - Digit keys 1..9,0,-,= → control indices 0..11 (first 12 slots).
 *     Extras map to q..p,[,] (indices 12..23) for longer schemas.
 *   - Pointer / touch down on the canvas → raycast from camera through
 *     cursor, find nearest intersected control mesh, press its index.
 *     Tracks active pointers so you can multi-touch chords on mobile.
 *
 * No framework. Raw `addEventListener`. Returns an unmount fn that removes
 * every listener for clean Capacitor re-entry.
 */

import type { World } from 'koota';
import { type Camera, Raycaster, Vector2 } from 'three';
import { Input, Level } from '@/sim/world';
import type { EmergentControls } from '@/three/emergent-controls';

export interface InputOptions {
  world: World;
  canvas: HTMLCanvasElement;
  camera: Camera;
  /** Accessor — the rig rebuilds on schema change, so don't hold a ref. */
  getControls: () => EmergentControls;
}

const KEY_ORDER = [
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
  'Minus',
  'Equal',
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyT',
  'KeyY',
  'KeyU',
  'KeyI',
  'KeyO',
  'KeyP',
  'BracketLeft',
  'BracketRight',
];

export function mountInputListeners(opts: InputOptions): () => void {
  const { world, canvas, camera, getControls } = opts;

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  /** Maps pointerId → control index so release hits the right slot. */
  const activePointers = new Map<number, number>();

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

  // ── Keyboard ────────────────────────────────────────────────────────────
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

  // ── Pointer / touch raycast ─────────────────────────────────────────────
  /** Convert a DOM event's client coords into Three NDC. */
  function updateNDC(clientX: number, clientY: number): void {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  /** Resolve the clicked control index from a canvas event, or null if none. */
  function hitTest(clientX: number, clientY: number): number | null {
    updateNDC(clientX, clientY);
    raycaster.setFromCamera(ndc, camera);
    const rig = getControls();
    const hittable = rig.controls.map((c) => c.mesh);
    const hits = raycaster.intersectObjects(hittable, false);
    if (hits.length === 0) return null;
    const hitMesh = hits[0].object;
    const idx = rig.controls.findIndex((c) => c.mesh === hitMesh);
    return idx >= 0 ? idx : null;
  }

  function pointerDown(ev: PointerEvent): void {
    const idx = hitTest(ev.clientX, ev.clientY);
    if (idx === null) return;
    activePointers.set(ev.pointerId, idx);
    press(idx);
    canvas.setPointerCapture(ev.pointerId);
  }

  function pointerUp(ev: PointerEvent): void {
    const idx = activePointers.get(ev.pointerId);
    if (idx === undefined) return;
    activePointers.delete(ev.pointerId);
    release(idx);
    if (canvas.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
    }
  }

  function pointerCancel(ev: PointerEvent): void {
    pointerUp(ev);
  }

  // ── Wire ────────────────────────────────────────────────────────────────
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);

  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';

  return function unmount() {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerCancel);
    // Release every held key on unmount so the next mount starts clean.
    for (const idx of activePointers.values()) release(idx);
    activePointers.clear();
  };
}
