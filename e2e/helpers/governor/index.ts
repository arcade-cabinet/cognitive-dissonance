/**
 * Game Governor — Public API
 *
 * Automated playthrough controller for E2E testing.
 * Simulates realistic player behavior with configurable
 * accuracy, aggressiveness, and reaction time.
 *
 * @example
 * ```ts
 * import { GameGovernor } from './helpers/governor';
 *
 * const governor = new GameGovernor(page, { accuracy: 0.9, seed: 123 });
 * const result = await governor.playthrough();
 * ```
 */

export { GameGovernor, runAutomatedPlaythrough } from './governor';
// Re-export internals for testing and extension
export { createRng } from './rng';
export { isGameRunning, readEnemyCounters, readResult, readSnapshot } from './state-reader';
export { bestCounterKey, decideAction, evaluateNuke, randomAbilityKey } from './strategies';
export type {
  CounterType,
  GameSnapshot,
  GovernorAction,
  GovernorConfig,
  PlaythroughResult,
  ResolvedConfig,
} from './types';
export { ABILITY_KEYS, COUNTER_KEY_MAP, DEFAULT_CONFIG, NUKE_KEY, resolveConfig } from './types';
