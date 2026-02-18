// lib/seed-factory.ts
import { useSeedStore } from '@/store/seed-store'

export type EnemyConfig = {
  amount: number;
  speed: number;
  colorTint: string;
  splitChance: number;
  aggression: number;
  behavior: 'zigzag' | 'split' | 'seek' | 'wander';
}

export const generateFromSeed = () => {
  const { rng } = useSeedStore.getState();
  const a = rng(); const b = rng(); const c = rng();

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
    }
  };
};