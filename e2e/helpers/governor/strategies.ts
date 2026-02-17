/**
 * Governor Decision Strategies
 *
 * Pure functions that take game state + config and return an action.
 * No Playwright dependency — fully unit-testable with Vitest.
 *
 * Decision priority:
 *   1. Nuke (panic critical + nuke ready)
 *   2. Accuracy miss (simulated human error → random key)
 *   3. Intelligent counter (frequency analysis of enemy types)
 *   4. Fallback (random key when no enemy data available)
 *   5. Aggressiveness gate (may choose to wait)
 */

import type {
  AbilityKey,
  CounterType,
  GameSnapshot,
  GovernorAction,
  ResolvedConfig,
} from './types';
import { ABILITY_KEYS, COUNTER_KEY_MAP, NUKE_KEY } from './types';

/**
 * Evaluate whether to use the nuke ability.
 * Returns a nuke action when panic exceeds threshold, nuke is ready,
 * and specials are enabled. Otherwise returns null.
 */
export function evaluateNuke(
  snapshot: GameSnapshot,
  config: ResolvedConfig
): GovernorAction | null {
  if (config.useSpecials && snapshot.nukeReady && snapshot.panic > config.nukeThreshold) {
    return { type: 'press', key: NUKE_KEY };
  }
  return null;
}

/**
 * Pick a random ability key using the seeded RNG.
 * Used for accuracy misses and fallback when no enemy data is available.
 */
export function randomAbilityKey(rng: () => number): AbilityKey {
  return ABILITY_KEYS[Math.floor(rng() * ABILITY_KEYS.length)];
}

/**
 * Analyze enemy counter types and return the key that counters
 * the most frequently occurring enemy type.
 *
 * Uses simple frequency analysis: if there are 3 reality enemies
 * and 1 logic enemy, pressing F1 (reality counter) is optimal.
 */
export function bestCounterKey(enemyCounters: CounterType[]): AbilityKey {
  const freq: Partial<Record<CounterType, number>> = {};
  for (const counter of enemyCounters) {
    freq[counter] = (freq[counter] || 0) + 1;
  }

  let bestType: CounterType = enemyCounters[0];
  let bestCount = 0;
  for (const [type, count] of Object.entries(freq) as [CounterType, number][]) {
    if (count > bestCount) {
      bestType = type;
      bestCount = count;
    }
  }

  return COUNTER_KEY_MAP[bestType];
}

/**
 * Main decision function — determines what action to take this tick.
 *
 * Flow:
 * 1. Nuke check (highest priority — prevents game over)
 * 2. Accuracy roll — miss simulates human error
 * 3. If enemies present → frequency analysis → best counter
 * 4. If no enemies → random ability key (fallback)
 * 5. Aggressiveness gate — may choose to wait instead of pressing
 */
export function decideAction(
  snapshot: GameSnapshot,
  config: ResolvedConfig,
  rng: () => number
): GovernorAction {
  // 1. Nuke check (highest priority)
  const nukeAction = evaluateNuke(snapshot, config);
  if (nukeAction) return nukeAction;

  // 2. Accuracy roll — simulate human error
  if (rng() > config.accuracy) {
    return { type: 'press', key: randomAbilityKey(rng) };
  }

  // 3. Determine counter key
  let key: AbilityKey;
  if (snapshot.enemyCounters.length > 0) {
    key = bestCounterKey(snapshot.enemyCounters);
  } else {
    // No enemy data available — fall back to random key
    key = randomAbilityKey(rng);
  }

  // 4. Aggressiveness gate — may choose to wait
  if (rng() < config.aggressiveness) {
    return { type: 'press', key };
  }

  return { type: 'wait' };
}
