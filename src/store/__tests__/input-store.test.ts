import { useInputStore } from '../input-store';

describe('input-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useInputStore.getState().reset();
  });

  it('initializes with empty pressedKeys set', () => {
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.size).toBe(0);
  });

  it('pressKey adds key to pressedKeys', () => {
    const { pressKey } = useInputStore.getState();
    pressKey('a');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.has('A')).toBe(true);
  });

  it('pressKey normalizes key to uppercase', () => {
    const { pressKey } = useInputStore.getState();
    pressKey('q');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.has('Q')).toBe(true);
    expect(pressedKeys.has('q')).toBe(false);
  });

  it('pressKey handles already-uppercase keys', () => {
    const { pressKey } = useInputStore.getState();
    pressKey('W');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.has('W')).toBe(true);
  });

  it('releaseKey removes key from pressedKeys', () => {
    const { pressKey, releaseKey } = useInputStore.getState();
    pressKey('a');
    releaseKey('a');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.has('A')).toBe(false);
  });

  it('releaseKey normalizes key to uppercase', () => {
    const { pressKey } = useInputStore.getState();
    pressKey('E');
    useInputStore.getState().releaseKey('e');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.has('E')).toBe(false);
  });

  it('releaseKey is a no-op for keys that are not pressed', () => {
    const { releaseKey } = useInputStore.getState();
    // Should not throw
    releaseKey('z');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.size).toBe(0);
  });

  it('isKeyPressed returns true for pressed keys', () => {
    const { pressKey } = useInputStore.getState();
    pressKey('r');
    const { isKeyPressed } = useInputStore.getState();
    expect(isKeyPressed('r')).toBe(true);
    expect(isKeyPressed('R')).toBe(true);
  });

  it('isKeyPressed returns false for unpressed keys', () => {
    const { isKeyPressed } = useInputStore.getState();
    expect(isKeyPressed('x')).toBe(false);
  });

  it('tracks multiple simultaneous pressed keys', () => {
    const { pressKey } = useInputStore.getState();
    pressKey('q');
    pressKey('w');
    pressKey('e');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.size).toBe(3);
    expect(pressedKeys.has('Q')).toBe(true);
    expect(pressedKeys.has('W')).toBe(true);
    expect(pressedKeys.has('E')).toBe(true);
  });

  it('pressing the same key multiple times does not duplicate', () => {
    const { pressKey } = useInputStore.getState();
    pressKey('q');
    pressKey('q');
    pressKey('q');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.size).toBe(1);
  });

  it('reset clears all pressed keys', () => {
    const { pressKey, reset } = useInputStore.getState();
    pressKey('q');
    pressKey('w');
    pressKey('e');
    reset();
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.size).toBe(0);
  });

  it('isKeyPressed works correctly after reset', () => {
    const { pressKey, reset } = useInputStore.getState();
    pressKey('q');
    reset();
    const { isKeyPressed } = useInputStore.getState();
    expect(isKeyPressed('q')).toBe(false);
  });

  it('can press keys again after reset', () => {
    const { pressKey, reset } = useInputStore.getState();
    pressKey('q');
    reset();
    pressKey('w');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.size).toBe(1);
    expect(pressedKeys.has('W')).toBe(true);
    expect(pressedKeys.has('Q')).toBe(false);
  });

  it('partial release preserves other keys', () => {
    const { pressKey, releaseKey } = useInputStore.getState();
    pressKey('q');
    pressKey('w');
    pressKey('e');
    releaseKey('w');
    const { pressedKeys } = useInputStore.getState();
    expect(pressedKeys.size).toBe(2);
    expect(pressedKeys.has('Q')).toBe(true);
    expect(pressedKeys.has('W')).toBe(false);
    expect(pressedKeys.has('E')).toBe(true);
  });
});
