import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../game-store';

describe('game-store', () => {
  beforeEach(() => {
    useGameStore.setState({ phase: 'title', restartToken: 0 });
  });

  it('initial phase is title', () => {
    expect(useGameStore.getState().phase).toBe('title');
  });

  it('setPhase changes phase', () => {
    useGameStore.getState().setPhase('playing');
    expect(useGameStore.getState().phase).toBe('playing');
  });

  it('togglePause from playing goes to paused', () => {
    useGameStore.getState().setPhase('playing');
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().phase).toBe('paused');
  });

  it('togglePause from paused goes to playing', () => {
    useGameStore.getState().setPhase('paused');
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().phase).toBe('playing');
  });

  it('togglePause from title does nothing', () => {
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().phase).toBe('title');
  });

  it('togglePause from gameover does nothing', () => {
    useGameStore.getState().setPhase('gameover');
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().phase).toBe('gameover');
  });

  it('restart sets phase to title', () => {
    useGameStore.getState().setPhase('playing');
    useGameStore.getState().restart();
    expect(useGameStore.getState().phase).toBe('title');
  });

  it('triggerRestart increments restartToken and sets playing', () => {
    useGameStore.getState().setPhase('gameover');
    useGameStore.getState().triggerRestart();
    const state = useGameStore.getState();
    expect(state.phase).toBe('playing');
    expect(state.restartToken).toBe(1);
  });
});
