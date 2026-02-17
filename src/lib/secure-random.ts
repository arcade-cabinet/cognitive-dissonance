/**
 * Secure Random Number Generator
 *
 * Provides a cryptographically secure replacement for Math.random()
 * using the Web Crypto API.
 */
export function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}
