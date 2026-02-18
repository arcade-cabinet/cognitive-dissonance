import { useSeedStore } from '@/store/seed-store';

export type EnemyConfig = {
  amount: number;
  speed: number;
  colorTint: string;
  splitChance: number;
  aggression: number;
  behavior: 'zigzag' | 'split' | 'seek' | 'wander';
};

export type KeycapPortraitParams = {
  color: string;
  intensity: number;
  shape: 'cube' | 'sphere' | 'torus' | 'fragment';
};

export const generateFromSeed = (): {
  enemyConfig: EnemyConfig;
  keycapPortrait: KeycapPortraitParams;
} => {
  const { rng } = useSeedStore.getState();

  const a = rng();
  const b = rng();
  const c = rng();

  const behaviorRoll = c;
  let behavior: EnemyConfig['behavior'] = 'wander';
  if (behaviorRoll < 0.25) behavior = 'zigzag';
  else if (behaviorRoll < 0.5) behavior = 'split';
  else if (behaviorRoll < 0.75) behavior = 'seek';

  return {
    enemyConfig: {
      amount: Math.floor(3 + a * 9),
      speed: 0.8 + b * 2.2,
      colorTint: `hsl(${c * 360}, 85%, 65%)`,
      splitChance: c * 0.7,
      aggression: b,
      behavior,
    },
    keycapPortrait: {
      color: `hsl(${a * 360}, 90%, 70%)`,
      intensity: 0.6 + b * 0.4,
      shape: c > 0.6 ? 'fragment' : c > 0.3 ? 'torus' : 'sphere',
    },
  };
};
