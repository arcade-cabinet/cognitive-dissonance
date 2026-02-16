import { describe, expect, it } from 'vitest';
import type { GameState } from './events';
import { initialUIState, uiReducer } from './ui-state';

describe('UI State Reducer', () => {
  describe('START_GAME', () => {
    it('should transition to playing screen', () => {
      const state = uiReducer(initialUIState, { type: 'START_GAME' });
      expect(state.screen).toBe('playing');
      expect(state.score).toBe(0);
      expect(state.wave).toBe(0);
      expect(state.panic).toBe(0);
    });

    it('should reset previous game state', () => {
      const prevState = {
        ...initialUIState,
        screen: 'gameover' as const,
        score: 5000,
        win: true,
        gameOverStats: { totalC: 50, totalM: 10, maxCombo: 8, nukesUsed: 2, wavesCleared: 5 },
      };
      const state = uiReducer(prevState, { type: 'START_GAME' });
      expect(state.screen).toBe('playing');
      expect(state.score).toBe(0);
      expect(state.gameOverStats).toBeNull();
      expect(state.win).toBe(false);
    });
  });

  describe('START_ENDLESS', () => {
    it('should transition to playing and keep score', () => {
      const prevState = {
        ...initialUIState,
        screen: 'gameover' as const,
        score: 10000,
        win: true,
        gameOverStats: { totalC: 80, totalM: 5, maxCombo: 15, nukesUsed: 1, wavesCleared: 5 },
      };
      const state = uiReducer(prevState, { type: 'START_ENDLESS' });
      expect(state.screen).toBe('playing');
      expect(state.score).toBe(10000);
      expect(state.gameOverStats).toBeNull();
    });
  });

  describe('UPDATE_STATE', () => {
    it('should sync game state to UI', () => {
      const gameState = {
        score: 1500,
        wave: 2,
        panic: 45,
        combo: 3,
        waveTime: 28,
        nukeCd: 5,
        nukeMax: 10,
        abilityCd: { reality: 2, history: 0, logic: 3 },
        abilityMax: { reality: 8, history: 8, logic: 8 },
        pu: { slow: 5, shield: 0, double: 3 },
      } as GameState;

      const state = uiReducer(
        { ...initialUIState, screen: 'playing' },
        {
          type: 'UPDATE_STATE',
          state: gameState,
        }
      );

      expect(state.score).toBe(1500);
      expect(state.wave).toBe(2);
      expect(state.panic).toBe(45);
      expect(state.combo).toBe(3);
      expect(state.time).toBe(28);
      expect(state.nukeCd).toBe(5);
      expect(state.abilityCd.reality).toBe(2);
      expect(state.pu.slow).toBe(5);
    });
  });

  describe('GAME_OVER', () => {
    it('should set gameover screen with stats on loss', () => {
      const state = uiReducer(
        { ...initialUIState, screen: 'playing' },
        {
          type: 'GAME_OVER',
          score: 3000,
          win: false,
          stats: { totalC: 30, totalM: 20, maxCombo: 5, nukesUsed: 3, wavesCleared: 2 },
        }
      );

      expect(state.screen).toBe('gameover');
      expect(state.win).toBe(false);
      expect(state.score).toBe(3000);
      expect(state.gameOverStats?.totalC).toBe(30);
      expect(state.gameOverStats?.wavesCleared).toBe(2);
    });

    it('should set gameover screen with stats on win', () => {
      const state = uiReducer(
        { ...initialUIState, screen: 'playing' },
        {
          type: 'GAME_OVER',
          score: 15000,
          win: true,
          stats: { totalC: 90, totalM: 5, maxCombo: 20, nukesUsed: 1, wavesCleared: 5 },
        }
      );

      expect(state.screen).toBe('gameover');
      expect(state.win).toBe(true);
      expect(state.gameOverStats?.maxCombo).toBe(20);
    });
  });

  describe('WAVE_START', () => {
    it('should show wave announcement', () => {
      const state = uiReducer(
        { ...initialUIState, screen: 'playing' },
        {
          type: 'WAVE_START',
          title: 'WAVE 3',
          sub: 'The rabbit hole deepens',
        }
      );

      expect(state.showWave).toBe(true);
      expect(state.waveTitle).toBe('WAVE 3');
      expect(state.waveSub).toBe('The rabbit hole deepens');
    });
  });

  describe('HIDE_WAVE', () => {
    it('should hide wave announcement', () => {
      const prev = { ...initialUIState, showWave: true, waveTitle: 'WAVE 1', waveSub: 'test' };
      const state = uiReducer(prev, { type: 'HIDE_WAVE' });
      expect(state.showWave).toBe(false);
    });
  });

  describe('ADD_FEED', () => {
    it('should prepend feed item with generated id', () => {
      const state = uiReducer(initialUIState, {
        type: 'ADD_FEED',
        item: { handle: '@elon', text: 'AGI is here!', stat: '+100' },
      });

      expect(state.feed).toHaveLength(1);
      expect(state.feed[0].handle).toBe('@elon');
      expect(state.feed[0].text).toBe('AGI is here!');
      expect(state.feed[0].id).toBeGreaterThan(0);
    });

    it('should cap feed at 3 items', () => {
      let state = initialUIState;
      for (let i = 0; i < 5; i++) {
        state = uiReducer(state, {
          type: 'ADD_FEED',
          item: { handle: `@user${i}`, text: `msg${i}`, stat: `+${i}` },
        });
      }
      expect(state.feed).toHaveLength(3);
      expect(state.feed[0].handle).toBe('@user4'); // Most recent first
    });
  });

  describe('BOSS_START', () => {
    it('should set boss state', () => {
      const state = uiReducer(initialUIState, {
        type: 'BOSS_START',
        name: 'THE HYPE TRAIN',
        hp: 100,
      });

      expect(state.boss).not.toBeNull();
      expect(state.boss?.name).toBe('THE HYPE TRAIN');
      expect(state.boss?.hp).toBe(100);
      expect(state.boss?.maxHp).toBe(100);
    });
  });

  describe('BOSS_HIT', () => {
    it('should update boss HP', () => {
      const prev = { ...initialUIState, boss: { name: 'BOSS', hp: 100, maxHp: 100 } };
      const state = uiReducer(prev, { type: 'BOSS_HIT', hp: 75, maxHp: 100 });
      expect(state.boss?.hp).toBe(75);
    });

    it('should return null boss if no active boss', () => {
      const state = uiReducer(initialUIState, { type: 'BOSS_HIT', hp: 50, maxHp: 100 });
      expect(state.boss).toBeNull();
    });
  });

  describe('BOSS_DIE', () => {
    it('should clear boss state', () => {
      const prev = { ...initialUIState, boss: { name: 'BOSS', hp: 0, maxHp: 100 } };
      const state = uiReducer(prev, { type: 'BOSS_DIE' });
      expect(state.boss).toBeNull();
    });
  });
});
