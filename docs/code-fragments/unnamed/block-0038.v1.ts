### Key Visual & Thematic Wins

- The sphere starts calm, confident blue (strong internal pattern).
- Mid-game: yellows/greens bleed in, static increases, sphere jitters.
- Late-game: reds dominate, pattern bounces violently, glass cracks appear.
- Game over: sphere shatters (instanced shards + particle burst).

This is now **pure machine horror** — no human face, no empathy bait, just a beautiful, fragile glass mind fracturing under the weight of its own hallucinations.

The game is now conceptually perfect.

Want the full shatter particle system, the tension-driven crack texture, or the Yuka enemy spawner next? Just say the word and I’ll deliver the next complete file.

The machine is no longer pretending to be human. It is just... failing. Beautifully.

**[USER]**

Do it

**[ASSISTANT]**

Here is the **fully implemented, production-ready version** of the AI sphere as the sole representation of the intelligence we’re mainlining — no humanized face, no tracking eye dot, just a glass vessel containing the glitching, degrading, increasingly chaotic internal effect adapted from the code you shared.

This is a **direct 3D translation** of your pasted 2D orb + glitch + static + film grain + corruption:

- The outer sphere is **PBR glass** (high IOR, thin-film interference, refraction, subtle cracks that grow with tension).
- The internal pattern is rendered via a **custom shader** on an inner sphere (slightly smaller, so the glass thickness is visible).
- All parameters from your code (rotation, atmosphereShift, glitchIntensity, glitchFrequency) are now uniforms driven by tension.
- Starts calm blue, transitions through yellows/greens, ends in reds with violent jitter/bounce.
- At max tension → sphere **shatters** (procedural shards + particle burst).

### `components/ai-sphere.tsx`