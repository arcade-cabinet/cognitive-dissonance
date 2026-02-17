/**
 * Governor Type Definitions
 *
 * Shared types for the game governor subpackage.
 * All types are pure data — no Playwright or browser dependencies.
 */

/** Counter ability types matching the game's 3 abilities */
export type CounterType = 'reality' | 'history' | 'logic';

/** Keyboard key for each counter ability */
export type AbilityKey = 'F1' | 'F2' | 'F3';

/** Nuke keyboard key */
export const NUKE_KEY = 'F4' as const;

/** Maps counter types to their keyboard shortcuts */
export const COUNTER_KEY_MAP: Record<CounterType, AbilityKey> = {
  reality: 'F1',
  history: 'F2',
  logic: 'F3',
};

/** All ability keys for random selection */
export const ABILITY_KEYS: readonly AbilityKey[] = ['F1', 'F2', 'F3'];

/** Governor configuration (all optional with sensible defaults) */
export interface GovernorConfig {
  /** How aggressively to counter enemies (0-1). Default: 0.7 */
  aggressiveness?: number;
  /** Reaction time between decisions in ms. Default: 300 */
  reactionTime?: number;
  /** Whether to use nuke ability. Default: true */
  useSpecials?: boolean;
  /** Target accuracy (0-1). Probability of correct vs random counter. Default: 0.8 */
  accuracy?: number;
  /** Seed for deterministic RNG. Default: 42 */
  seed?: number;
  /** Panic threshold for nuke activation (0-100). Default: 50 */
  nukeThreshold?: number;
}

/** Resolved config with all defaults applied */
export interface ResolvedConfig {
  aggressiveness: number;
  reactionTime: number;
  useSpecials: boolean;
  accuracy: number;
  nukeThreshold: number;
}

/** Snapshot of game state at a point in time */
export interface GameSnapshot {
  /** Current panic level (0-100) */
  panic: number;
  /** Current score */
  score: number;
  /** Elapsed time in seconds */
  time: number;
  /** Whether the nuke ability is off cooldown */
  nukeReady: boolean;
  /** Counter types of all enemies currently on screen */
  enemyCounters: CounterType[];
}

/** Decision output from a strategy */
export type GovernorAction =
  | { type: 'press'; key: AbilityKey | typeof NUKE_KEY }
  | { type: 'wait' };

/** Game result from a completed playthrough */
export interface PlaythroughResult {
  result: 'win' | 'loss';
  score: number;
}

/** Default configuration values */
export const DEFAULT_CONFIG: ResolvedConfig = {
  aggressiveness: 0.7,
  reactionTime: 300,
  useSpecials: true,
  accuracy: 0.8,
  nukeThreshold: 50,
};

/** Resolve partial config into fully specified config with defaults */
export function resolveConfig(config: GovernorConfig = {}): {
  resolved: ResolvedConfig;
  seed: number;
} {
  return {
    resolved: {
      aggressiveness: config.aggressiveness ?? DEFAULT_CONFIG.aggressiveness,
      reactionTime: config.reactionTime ?? DEFAULT_CONFIG.reactionTime,
      useSpecials: config.useSpecials ?? DEFAULT_CONFIG.useSpecials,
      accuracy: config.accuracy ?? DEFAULT_CONFIG.accuracy,
      nukeThreshold: config.nukeThreshold ?? DEFAULT_CONFIG.nukeThreshold,
    },
    seed: config.seed ?? 42,
  };
}
