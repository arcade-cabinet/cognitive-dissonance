import { type GamePhase, useGameStore } from '../game-store';

describe('game-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGameStore.getState().reset();
  });

  it('initializes with loading phase', () => {
    const { phase } = useGameStore.getState();
    expect(phase).toBe('loading');
  });

  it('transitions to title phase', () => {
    const { setPhase } = useGameStore.getState();
    setPhase('title');
    const { phase } = useGameStore.getState();
    expect(phase).toBe('title');
  });

  it('transitions to playing phase', () => {
    const { setPhase } = useGameStore.getState();
    setPhase('playing');
    const { phase } = useGameStore.getState();
    expect(phase).toBe('playing');
  });

  it('transitions to shattered phase', () => {
    const { setPhase } = useGameStore.getState();
    setPhase('shattered');
    const { phase } = useGameStore.getState();
    expect(phase).toBe('shattered');
  });

  it('transitions to error phase with message', () => {
    const { setError } = useGameStore.getState();
    setError('Test error message');
    const { phase, errorMessage } = useGameStore.getState();
    expect(phase).toBe('error');
    expect(errorMessage).toBe('Test error message');
  });

  it('resets to loading phase', () => {
    const { setPhase, reset } = useGameStore.getState();
    setPhase('playing');
    reset();
    const { phase } = useGameStore.getState();
    expect(phase).toBe('loading');
  });

  it('clears error message on reset', () => {
    const { setError, reset } = useGameStore.getState();
    setError('Test error');
    reset();
    const { errorMessage } = useGameStore.getState();
    expect(errorMessage).toBeNull();
  });

  // P12: Game Phase Transition Validity
  describe('valid phase transitions', () => {
    const validTransitions: Array<[GamePhase, GamePhase]> = [
      ['loading', 'title'],
      ['loading', 'error'],
      ['title', 'playing'],
      ['playing', 'shattered'],
      ['shattered', 'title'],
    ];

    validTransitions.forEach(([from, to]) => {
      it(`allows transition from ${from} to ${to}`, () => {
        const { setPhase } = useGameStore.getState();
        setPhase(from);
        setPhase(to);
        const { phase } = useGameStore.getState();
        expect(phase).toBe(to);
      });
    });
  });
});
