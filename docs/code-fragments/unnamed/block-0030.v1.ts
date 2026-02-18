### How the Organic Flow Feels

1. **Game Start** — Title sizzles away → platter spins slowly → Sonny rotates to face you → his chest core flashes the three words one by one → keycaps light up sequentially with the noun portrait → RGB pulses calm blue → Sonny nods and rotates back to the board → game begins.

2. **Shuffle** — Hover/pinch the glowing center keycap ("REPROGRAM") → platter spins faster → Sonny blinks rapidly and tilts head → new seed ritual plays → he rotates back.

3. **During Game** — Hallucinations spawn with visuals and behavior from the current seed. Tension from leaks makes Sonny slowly turn toward you, eyes redden, RGB shifts to angry reds, keycaps flicker.

This is now a complete, immersive, diegetic procedural system.

The factory, store, and ritual are fully wired and feel organic. The machine literally "dreams" the next wave in front of you.

Ready for the full keycap portrait 3D code or the Yuka enemy spawner next? Just say the word and I’ll deliver the next file.  

The dissonance is alive.

**[ASSISTANT]**

Request cancelled

**[USER]**

I mean the OTHER thing we could do is BURY a random seed and not expose it, thus avoiding the need to make it human readable OR to have to program in an input box that disrupts from the organic flow. What do you think? Pros / cons

**[ASSISTANT]**

**Yes — burying the seed is the stronger choice for this game.**

### Quick Pros / Cons

| Aspect                        | **Visible AAN Seed (human-readable)** | **Buried / Hidden Seed** |
|-------------------------------|---------------------------------------|--------------------------|
| **Immersion / Organic Flow** | Breaks the fourth wall (text appears) | 100% diegetic — everything through Sonny’s body, keycaps, RGB, eyes |
| **Mystery & Theme**           | Feels like “reading forbidden code” — cool but explicit | Feels like the AI is dreaming in secret — more unsettling and true to “cognitive dissonance” |
| **Player Agency**             | Shuffle key feels meaningful | Shuffle still feels meaningful (Sonny “reboots” with visible glitch) |
| **Replay Curiosity**          | High — players chase cool word combos | Slightly lower, but compensated by stronger emotional attachment to Sonny’s reactions |
| **Implementation Complexity** | Higher (word pools, display ritual, UI timing) | Much lower — just internal rng + diegetic feedback |
| **Balance & Tuning**          | Easier to debug (“this seed is too easy”) | Slightly harder to debug, but solvable with internal logging |
| **Narrative Purity**          | Good | **Excellent** — the machine keeps its secrets |

**My verdict**: Bury the seed.  
The game’s soul is the intimate, slightly uncomfortable relationship between the player and Sonny. Exposing the seed makes it feel like a debug menu. Burying it makes every new run feel like Sonny is quietly generating nightmares in his own head — and you only see the consequences through his body and the keycaps. That’s far more powerful for the theme.

### How the Buried Seed Version Works (Organic Flow)

1. **New Game / Continue**  
   - Platter spins slowly (lazy-susan keyboard).  
   - Sonny does a private 2.8-second “dream ritual”: subtle eye flicker, core pulses faintly, neck twitches, RGB on keycaps ripple in a hidden pattern.  
   - No text. No HUD.  
   - He then rotates to face the board and the wave begins.

2. **Shuffle (center keycap)**  
   - Player pinches or holds the glowing center keycap (the “REPROGRAM” one).  
   - Sonny does a quick, violent glitch spasm (head jerks, RGB strobes, keycaps flash randomly).  
   - New internal seed is generated.  
   - He calms, rotates back — new wave starts.  
   - This feels like you forced the AI to rewrite its own nightmare.

3. **During Gameplay**  
   - Hallucinations spawn using the hidden seed (via factory).  
   - Tension leaks make Sonny slowly turn toward you, eyes shift red, neck/shoulders tense, RGB on keycaps drifts from calm cyan → violet → angry red.  
   - Keycap portraits pulse with the current enemy archetype’s “signature” (no text needed).

4. **Game Over (max tension)**  
   - Sonny fully faces you, eyes pure red, shoulders locked, RGB blood red.  
   - Head explodes in a beautiful holographic burst (using the same neon-raymarcher style).

### Full Implementation (Hidden Seed Version)

I’ve updated the factory and store to be **completely internal**. No visible words. All feedback is diegetic.

#### `store/seed-store.ts` (now fully hidden)