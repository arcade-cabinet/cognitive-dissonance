/**
 * Tension-driver system — the meta-gameplay layer.
 *
 * Runs alongside the pattern-stabilizer and governs:
 *   - Passive tension decay (idle tension slowly drifts toward a calm
 *     baseline so the player isn't punished for thinking)
 *   - Coherence drain under high tension (the AI is losing the plot)
 *   - Game-over trigger when coherence hits 0
 *   - Level advancement when coherence passes a threshold
 *
 * Runs every frame (not fixed-step — these are slow continuous changes,
 * small frame-rate variance is imperceptible).
 */

import type { World } from 'koota';
import { setPhase } from '../actions';
import { Game, Level } from '../world';

const IDLE_TENSION_DECAY = 0.04; // per sec, drifts toward 0.12 baseline
const TENSION_BASELINE = 0.12;
const HIGH_TENSION_THRESHOLD = 0.75;
const COHERENCE_DRAIN_PER_SEC = 2; // when tension > threshold
const LEVEL_UP_COHERENCE = 100;
const GAMEOVER_COHERENCE = 0;

export function tickTensionDriver(world: World, dt: number): void {
  if (world.get(Game)?.phase !== 'playing') return;

  const level = world.get(Level);
  if (!level) return;

  let { tension, coherence, currentLevel, peakCoherence } = level;

  // Passive decay toward baseline.
  const drift = tension - TENSION_BASELINE;
  tension -= Math.sign(drift) * Math.min(Math.abs(drift), IDLE_TENSION_DECAY * dt);

  // High-tension drain.
  if (tension > HIGH_TENSION_THRESHOLD) {
    const overage = (tension - HIGH_TENSION_THRESHOLD) / (1 - HIGH_TENSION_THRESHOLD);
    coherence -= COHERENCE_DRAIN_PER_SEC * overage * dt;
  }

  // Level up — at 100 coherence, advance level and reset to 25 with a
  // coherence boost carried into the next level's starting peak.
  if (coherence >= LEVEL_UP_COHERENCE) {
    currentLevel += 1;
    peakCoherence = Math.max(peakCoherence, coherence);
    coherence = 25;
    tension = TENSION_BASELINE;
    // Small event for audio + visuals to latch onto.
    window.dispatchEvent(new CustomEvent('coherenceMaintained', { detail: { level: currentLevel } }));
  }

  peakCoherence = Math.max(peakCoherence, coherence);

  // Game over — when coherence is drained to zero, the cognition shatters.
  if (coherence <= GAMEOVER_COHERENCE) {
    coherence = 0;
    world.set(Level, { ...level, tension: Math.max(tension, 0), coherence, currentLevel, peakCoherence });
    setPhase('gameover');
    window.dispatchEvent(new CustomEvent('gameOver', { detail: { peakCoherence, currentLevel } }));
    return;
  }

  world.set(Level, { ...level, tension, coherence, currentLevel, peakCoherence });
}
