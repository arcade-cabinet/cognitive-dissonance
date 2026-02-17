export type EnemyShape = 'denial' | 'delusion' | 'fallacy';

export interface EnemyType {
  words: string[];
  color: string;
  shape: EnemyShape;
  counter: 'reality' | 'history' | 'logic';
}

export interface Wave {
  name: string;
  sub: string;
  dur: number;
  spawn: number;
  max: number;
  spd: number;
  boss?: BossConfig;
}

export interface BossConfig {
  name: string;
  hp: number;
  pats: string[];
}

export interface PowerUp {
  id: string;
  icon: string;
  color: string;
  name: string;
  dur: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  word: string;
  type: EnemyType;
  vx: number;
  vy: number;
  counter: string;
  encrypted?: boolean;
  spd: number;
  child?: boolean;
  iFrame?: number;
}

export interface Boss {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  pat: string;
  timer: number;
  name: string;
  iFrame: number;
  xVel?: number;
  spiralAngle?: number;
}

export interface GameState {
  panic: number;
  combo: number;
  score: number;
  wave: number;
  time: number;
  running: boolean;
  endless: boolean;
  currentWave?: Wave;
  enemies: Enemy[];
  boss?: Boss;
}

export interface Star {
  x: number;
  y: number;
  z?: number;
  sz: number;
  sp: number;
  a: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  col: string;
}

export interface PowerUpInstance {
  id: string;
  x: number;
  y: number;
  vy: number;
  icon: string;
  color: string;
  dur: number;
}

export interface Trail {
  x: number;
  y: number;
  life: number;
  col: string;
}

export interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  col: string;
}

export interface MomentumPerks {
  spawnDelay: number;
  scoreBonus: number;
  cdReduction: number;
}
