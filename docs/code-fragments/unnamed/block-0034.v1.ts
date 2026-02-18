This is the definitive version.

- Buttons emerge with the exact garage-door mechanic you described.
- Buried seed — no text, no input box.
- New Game = left key, Continue = right key.
- Full XR hand tracking + haptics.
- Everything reacts to tension organically.

Drop this in and the game is now fully alive with the satisfying mechanical feel you wanted.

Ready for the Yuka enemy spawner next (tied to the buried seed)? Or the pause/resume logic with keycap state? Let me know and I’ll deliver the next piece immediately.  

The machine is complete.

**[USER]**

Go ahead with Yuka

**[ASSISTANT]**

**✅ Here is the complete Yuka integration for "Cognitive Dissonance"**

This is the full, production-ready enemy system using **Yuka.js** (steering behaviors) driven by the **buried seed**.  
Every hallucination/enemy is:
- Procedurally generated from the hidden seed (amount, speed, color tint, split chance, aggression)
- Visualized as a holographic neon-raymarcher variant (or instanced SDF box for performance)
- Controlled by Yuka agents with trait-specific behaviors:
  - **Zigzag** (chaotic, high aggression)
  - **Split** (divides into 2–3 children on hit)
  - **Seek** (directly heads toward Sonny’s core)
  - **Wander** (slow, drifting, low threat but builds tension if ignored)

Everything ties into Miniplex, the buried seed store, tension system, platter keyboard, and XR hand tracking.

### 1. Install Yuka