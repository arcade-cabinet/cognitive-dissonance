import { beforeEach, describe, expect, it } from 'vitest';
import { useInputStore } from '../input-store';

describe('input-store', () => {
  beforeEach(() => {
    useInputStore.getState().releaseAll();
  });

  it('initial heldKeycaps is empty', () => {
    expect(useInputStore.getState().heldKeycaps.size).toBe(0);
  });

  it('pressKeycap adds to set', () => {
    useInputStore.getState().pressKeycap(3);
    expect(useInputStore.getState().heldKeycaps.has(3)).toBe(true);
  });

  it('pressKeycap then pressKeycap has both', () => {
    useInputStore.getState().pressKeycap(3);
    useInputStore.getState().pressKeycap(7);
    const held = useInputStore.getState().heldKeycaps;
    expect(held.has(3)).toBe(true);
    expect(held.has(7)).toBe(true);
    expect(held.size).toBe(2);
  });

  it('releaseKeycap removes from set', () => {
    useInputStore.getState().pressKeycap(3);
    useInputStore.getState().pressKeycap(7);
    useInputStore.getState().releaseKeycap(3);
    const held = useInputStore.getState().heldKeycaps;
    expect(held.has(3)).toBe(false);
    expect(held.has(7)).toBe(true);
  });

  it('releaseAll clears everything', () => {
    useInputStore.getState().pressKeycap(1);
    useInputStore.getState().pressKeycap(5);
    useInputStore.getState().pressKeycap(11);
    useInputStore.getState().releaseAll();
    expect(useInputStore.getState().heldKeycaps.size).toBe(0);
  });

  it('pressing same keycap twice is idempotent', () => {
    useInputStore.getState().pressKeycap(4);
    useInputStore.getState().pressKeycap(4);
    expect(useInputStore.getState().heldKeycaps.size).toBe(1);
  });
});
