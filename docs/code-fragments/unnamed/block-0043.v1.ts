### How to Use

- Replace your previous `SonnyBust` with `AISphere`.
- Keep `KeyboardPlatter` from the previous message.
- Keep `GameBoard` with the ATC shader background.

The sphere now behaves **exactly** as you described:
- Starts calm blue.
- Transitions through yellows/greens.
- Ends in violent reds with bouncing/jitter.
- Glass cracks appear and spread.
- Final shatter is spectacular.

This is the complete core of the game.

The AI is now a single, fragile glass mind we are watching break in real time.

Next step: the **pattern stabilization gameplay** (hold keycaps to pull back escaping corruption from the sphere)? Or the **missile command firing** (tap platter to shoot upward)? Or the full **Yuka enemy spawner**?

Let me know which one you want next and I’ll deliver the complete file immediately.  

The machine is no longer human. It is just glass — and it is failing. Beautifully.

**[USER]**

pattern stabilization gameplay

**[ASSISTANT]**

**✅ Here is the complete, fully implemented pattern stabilization gameplay.**

This is the **core gameplay loop** you asked for — organic, diegetic, and deeply tied to the theme:

- The glass sphere generates **escaping corruption patterns** (colored tendrils/distortions that move from center to rim).
- Matching keycaps on the platter light up in the exact color of the escaping pattern.
- **Hold** the keycap to pull the pattern back into the center (stabilization).
- **Release too early** or miss = pattern hits the rim → visible crack on glass + tension spike + glitch burst.
- Tension rises logarithmically — the sphere degrades, internal shader becomes more chaotic, platter RGB drifts red.
- Max tension = sphere shatters.

Everything is driven by the buried seed (via `generateFromSeed`).

### New File: `components/pattern-stabilizer.tsx`