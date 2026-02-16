/**
 * UI State Management
 *
 * Reducer and types for game UI state.
 * Keeps all state logic out of the component TSX file.
 */

import type { GameState } from './events';

export type GameOverStats = {
  totalC: number;
  totalM: number;
  maxCombo: number;
  nukesUsed: number;
  wavesCleared: number;
};

export type UIState = {
  screen: 'start' | 'playing' | 'gameover' | 'endless_transition';
  score: number;
  wave: number;
  panic: number;
  combo: number;
  maxCombo: number;
  time: number;
  win: boolean;
  nukeCd: number;
  nukeMax: number;
  abilityCd: { reality: number; history: number; logic: number };
  abilityMax: { reality: number; history: number; logic: number };
  pu: { slow: number; shield: number; double: number };
  waveTitle: string;
  waveSub: string;
  showWave: boolean;
  boss: { name: string; hp: number; maxHp: number } | null;
  feed: { handle: string; text: string; stat: string; id: number }[];
  gameOverStats: GameOverStats | null;
};

export const initialUIState: UIState = {
  screen: 'start',
  score: 0,
  wave: 0,
  panic: 0,
  combo: 0,
  maxCombo: 0,
  time: 0,
  win: false,
  nukeCd: 0,
  nukeMax: 1,
  abilityCd: { reality: 0, history: 0, logic: 0 },
  abilityMax: { reality: 1, history: 1, logic: 1 },
  pu: { slow: 0, shield: 0, double: 0 },
  waveTitle: '',
  waveSub: '',
  showWave: false,
  boss: null,
  feed: [],
  gameOverStats: null,
};

export type UIAction =
  | { type: 'UPDATE_STATE'; state: GameState }
  | { type: 'GAME_OVER'; score: number; win: boolean; stats: GameOverStats }
  | { type: 'START_GAME' }
  | { type: 'START_ENDLESS' }
  | { type: 'WAVE_START'; title: string; sub: string }
  | { type: 'HIDE_WAVE' }
  | { type: 'ADD_FEED'; item: { handle: string; text: string; stat: string } }
  | { type: 'BOSS_START'; name: string; hp: number }
  | { type: 'BOSS_HIT'; hp: number; maxHp: number }
  | { type: 'BOSS_DIE' };

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'UPDATE_STATE':
      return {
        ...state,
        score: action.state.score,
        wave: action.state.wave,
        panic: action.state.panic,
        combo: action.state.combo,
        maxCombo: Math.max(state.maxCombo, action.state.combo),
        time: action.state.waveTime,
        nukeCd: action.state.nukeCd,
        nukeMax: action.state.nukeMax,
        abilityCd: action.state.abilityCd,
        abilityMax: action.state.abilityMax,
        pu: action.state.pu,
      };
    case 'GAME_OVER':
      return {
        ...state,
        screen: 'gameover',
        win: action.win,
        score: action.score,
        gameOverStats: action.stats,
      };
    case 'START_GAME':
      return { ...initialUIState, screen: 'playing' };
    case 'START_ENDLESS':
      return { ...state, screen: 'playing', gameOverStats: null };
    case 'WAVE_START':
      return { ...state, showWave: true, waveTitle: action.title, waveSub: action.sub };
    case 'HIDE_WAVE':
      return { ...state, showWave: false };
    case 'ADD_FEED':
      return {
        ...state,
        feed: [{ ...action.item, id: Date.now() + Math.random() }, ...state.feed.slice(0, 2)],
      };
    case 'BOSS_START':
      return { ...state, boss: { name: action.name, hp: action.hp, maxHp: action.hp } };
    case 'BOSS_HIT':
      return {
        ...state,
        boss: state.boss ? { ...state.boss, hp: action.hp, maxHp: action.maxHp } : null,
      };
    case 'BOSS_DIE':
      return { ...state, boss: null };
    default:
      return state;
  }
}
