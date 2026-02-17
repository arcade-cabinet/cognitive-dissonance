import type { Enemy, PowerUpInstance } from './types';

export type GameEvent =
  | { type: 'SFX'; name: string; args?: unknown[] }
  | { type: 'PARTICLE'; x: number; y: number; color: string }
  | { type: 'CONFETTI'; x: number; y: number; color: string }
  | { type: 'FEED'; handle: string; text: string; stat: string }
  | {
      type: 'GAME_OVER';
      score: number;
      win: boolean;
      totalC: number;
      totalM: number;
      maxCombo: number;
      nukesUsed: number;
      wavesCleared: number;
    }
  | { type: 'WAVE_START'; wave: number; title: string; sub: string }
  | { type: 'BOSS_START'; name: string; hp: number }
  | { type: 'BOSS_HIT'; hp: number; maxHp: number }
  | { type: 'BOSS_DIE' };

export type GameState = {
  enemies: Enemy[];
  powerups: PowerUpInstance[];
  score: number;
  panic: number;
  combo: number;
  wave: number;
  waveTime: number;
  abilityCd: { reality: number; history: number; logic: number };
  abilityMax: { reality: number; history: number; logic: number };
  nukeCd: number;
  nukeMax: number;
  pu: { slow: number; shield: number; double: number };
  boss: { x: number; y: number; hp: number; maxHp: number; name: string; iFrame: number } | null;
  running: boolean;
  fl: number;
  flCol: string;
  shake: number;
  events: GameEvent[];
};

export type WorkerMessage =
  | { type: 'START'; endless?: boolean; seed?: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'INPUT'; key: string }
  | { type: 'ABILITY'; ability: 'reality' | 'history' | 'logic' }
  | { type: 'NUKE' }
  | { type: 'CLICK'; x: number; y: number }
  | { type: 'TERMINATE' };

export type MainMessage =
  | { type: 'STATE'; state: GameState }
  | { type: 'ERROR'; message: string }
  | { type: 'READY' };
