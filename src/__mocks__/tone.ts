/**
 * Jest mock for tone (Tone.js).
 * Provides minimal stubs for modules that import * as Tone from 'tone'.
 */

class MockReverb {
  wet = { value: 0.6 };
  toDestination() {
    return this;
  }
  async generate() {}
  connect() {
    return this;
  }
  dispose() {}
}

class MockMetalSynth {
  volume = { value: -12 };
  connect() {
    return this;
  }
  triggerAttackRelease() {}
  dispose() {}
}

class MockNoise {
  volume = { value: -60, rampTo: () => {} };
  connect() {
    return this;
  }
  start() {}
  stop() {}
  dispose() {}
}

class MockFilter {
  connect() {
    return this;
  }
  dispose() {}
}

class MockGain {
  gain = { rampTo: () => {} };
  toDestination() {
    return this;
  }
  dispose() {}
}

export const Reverb = MockReverb;
export const MetalSynth = MockMetalSynth;
export const Noise = MockNoise;
export const Filter = MockFilter;
export const Gain = MockGain;

export function getContext() {
  return { state: 'suspended' };
}

export async function start() {}

export function dbToGain(_db: number) {
  return 0;
}
