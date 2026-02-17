/**
 * Panic Escalation System
 *
 * The SPINAL CORD of the game. Panic isn't a dumb linear counter —
 * it's a living, breathing system with logarithmic curves, natural
 * decay, zones with distinct feel, and dynamic difficulty feedback.
 *
 * Panic Zones:
 *   CALM     (0-25)  — Peaceful, normal gameplay. Forgiving.
 *   UNEASY   (25-50) — Tension building. Monitor glow shifts.
 *   PANICKED (50-75) — Full crisis. Music intense. Enemies aggressive.
 *   MELTDOWN (75-100) — Head explosion imminent. Near-death spiral.
 *
 * Key mechanics:
 *   - Logarithmic damage: early hits sting less, high-panic hits HURT
 *   - Natural decay: combos heal you, but recovery slows at high panic
 *   - Rubber banding: slight mercy near death, slight pressure when coasting
 *   - Panic modifies difficulty: spawn rate, speed, encryption chance
 */

/** Panic zone thresholds */
export const PANIC_THRESHOLDS = {
  UNEASY: 25,
  PANICKED: 50,
  MELTDOWN: 75,
  MAX: 100,
} as const;

export type PanicZone = 'calm' | 'uneasy' | 'panicked' | 'meltdown';

export function getPanicZone(panic: number): PanicZone {
  if (panic >= PANIC_THRESHOLDS.MELTDOWN) return 'meltdown';
  if (panic >= PANIC_THRESHOLDS.PANICKED) return 'panicked';
  if (panic >= PANIC_THRESHOLDS.UNEASY) return 'uneasy';
  return 'calm';
}

/**
 * Calculate actual panic damage using a sigmoid curve.
 *
 * At low panic (0-25): damage is softened (0.5x-0.7x) — forgiving early game
 * At mid panic (25-50): damage is near-normal (0.8x-1.1x)
 * At high panic (50-75): damage amplified (1.1x-1.5x) — punishment accelerates
 * At meltdown (75-100): damage spikes (1.5x-2.0x) — death spiral
 *
 * This creates the feel of "it was fine and then suddenly it WASN'T"
 */
export function calculatePanicDamage(baseDamage: number, currentPanic: number): number {
  // Sigmoid centered at 0.5, steepness factor 8
  const t = currentPanic / 100;
  const sigmoid = 1 / (1 + Math.exp(-8 * (t - 0.5)));
  // Map sigmoid (0-1) to multiplier (0.5-2.0)
  const multiplier = 0.5 + sigmoid * 1.5;
  return baseDamage * multiplier;
}

/**
 * Calculate natural panic decay per frame.
 *
 * - Must have combo >= 3 to start decaying (you have to EARN relief)
 * - Higher combo = faster recovery
 * - Recovery uses inverse logarithmic curve: fast at mid-panic, SLOW at high
 * - Meltdown zone (75+) barely decays — you earned that transformation
 * - Calm zone naturally settles to 0
 */
export function calculatePanicDecay(currentPanic: number, combo: number, dt: number): number {
  if (combo < 3 || currentPanic <= 0) return 0;

  // Base decay rate scales with combo (diminishing returns via sqrt)
  const comboFactor = Math.sqrt(Math.max(0, combo - 2)) * 0.15;

  // Zone-based decay resistance
  const t = currentPanic / 100;
  // At low panic: decays freely (1.0)
  // At mid panic: moderate resistance (0.6)
  // At high panic: heavy resistance (0.2)
  // At meltdown: almost no decay (0.05)
  const resistance = 1 - 0.95 * t ** 1.5;

  const decayPerFrame = comboFactor * resistance * dt * 0.08;
  return Math.min(decayPerFrame, currentPanic); // Never go below 0
}

/**
 * Dynamic difficulty modifiers driven by panic level.
 *
 * This is the rubber-banding system:
 * - Low panic → slight pressure increase (don't let player coast)
 * - High panic → slight mercy (don't make it impossible)
 * - But MELTDOWN zone removes mercy — you're in the death spiral
 */
export interface PanicModifiers {
  /** Multiplier on spawn delay (< 1 = faster spawns) */
  spawnRateMultiplier: number;
  /** Multiplier on enemy speed */
  speedMultiplier: number;
  /** Chance (0-1) that spawned enemies are encrypted */
  encryptChance: number;
  /** Chance (0-1) that spawned enemies are splitter/child variants */
  variantChance: number;
}

export function getPanicModifiers(panic: number, wave: number): PanicModifiers {
  const zone = getPanicZone(panic);
  const t = panic / 100;
  const waveFactor = 1 + wave * 0.05;

  switch (zone) {
    case 'calm':
      return {
        // Slight pressure when coasting — don't let player relax too much
        spawnRateMultiplier: 0.95 - t * 0.1, // 0.95 → 0.925
        speedMultiplier: 1.0 + t * 0.08,
        encryptChance: 0.02 * waveFactor,
        variantChance: 0.03 * waveFactor,
      };
    case 'uneasy':
      return {
        // Things intensifying
        spawnRateMultiplier: 0.9 - (t - 0.25) * 0.2, // 0.9 → 0.85
        speedMultiplier: 1.02 + (t - 0.25) * 0.3,
        encryptChance: (0.05 + (t - 0.25) * 0.1) * waveFactor,
        variantChance: (0.05 + (t - 0.25) * 0.08) * waveFactor,
      };
    case 'panicked':
      return {
        // Full crisis but with slight mercy on spawn rate
        spawnRateMultiplier: 0.85 - (t - 0.5) * 0.1, // 0.85 → 0.825
        speedMultiplier: 1.1 + (t - 0.5) * 0.2,
        encryptChance: (0.1 + (t - 0.5) * 0.15) * waveFactor,
        variantChance: (0.08 + (t - 0.5) * 0.1) * waveFactor,
      };
    case 'meltdown':
      return {
        // Death spiral — no mercy, maximum pressure
        spawnRateMultiplier: 0.75 - (t - 0.75) * 0.3, // 0.75 → 0.675
        speedMultiplier: 1.15 + (t - 0.75) * 0.4,
        encryptChance: Math.min(0.25, (0.15 + (t - 0.75) * 0.4) * waveFactor),
        variantChance: Math.min(0.2, (0.12 + (t - 0.75) * 0.3) * waveFactor),
      };
  }
}

/**
 * Character tension level thresholds.
 * Maps panic level to which visual tension state the character should be in.
 *
 * Note: The bust composition uses raw panic (0-100) for continuous deformation.
 * These discrete states are retained for systems that need categorical thresholds
 * (e.g., game logic, music layers, HUD effects).
 *
 * Uses hysteresis to prevent flickering between states (5% past threshold
 * to transition, 5% below to revert).
 */
export interface TransformState {
  state: 'normal' | 'panic' | 'meltdown';
  intensity: number; // 0-1 within current state
}

export function getTransformState(
  panic: number,
  previousState: 'normal' | 'panic' | 'meltdown'
): TransformState {
  // Hysteresis thresholds
  const NORMAL_TO_PANIC = 33;
  const PANIC_TO_NORMAL = 28;
  const PANIC_TO_MELTDOWN = 66;
  const MELTDOWN_TO_PANIC = 61;

  let state: 'normal' | 'panic' | 'meltdown';
  if (previousState === 'normal') {
    state = panic >= NORMAL_TO_PANIC ? 'panic' : 'normal';
  } else if (previousState === 'panic') {
    if (panic >= PANIC_TO_MELTDOWN) state = 'meltdown';
    else if (panic <= PANIC_TO_NORMAL) state = 'normal';
    else state = 'panic';
  } else {
    // meltdown
    state = panic <= MELTDOWN_TO_PANIC ? 'panic' : 'meltdown';
  }

  // Calculate intensity within current state band
  let intensity: number;
  switch (state) {
    case 'normal':
      intensity = Math.min(1, panic / NORMAL_TO_PANIC);
      break;
    case 'panic':
      intensity = Math.min(1, (panic - PANIC_TO_NORMAL) / (PANIC_TO_MELTDOWN - PANIC_TO_NORMAL));
      break;
    case 'meltdown':
      intensity = Math.min(1, (panic - MELTDOWN_TO_PANIC) / (100 - MELTDOWN_TO_PANIC));
      break;
  }

  return { state, intensity };
}
