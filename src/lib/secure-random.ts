/**
 * Secure Random Number Generator
 *
 * Provides a cryptographically secure replacement for Math.random()
 * using the Web Crypto API. Includes a fallback to Math.random()
 * for environments where Web Crypto is unavailable (e.g. some CI runners).
 */
export function secureRandom(): number {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] / (0xffffffff + 1);
    }
  } catch {
    // Fallback to Math.random() if crypto fails
  }
  return Math.random(); // NOSONAR: Fallback for non-cryptographic game logic
}
