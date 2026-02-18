<Engine 
  antialias 
  adaptToDeviceRatio={true}
  forceWebGL={true}                    // ← RECOMMENDED for Cognitive Dissonance (complex GLSL raymarchers + nebula)
  engineOptions={{
    audioEngine: false,                // we use Tone.js exclusively
    preserveDrawingBuffer: false,
    powerPreference: "high-performance"
  }}
>