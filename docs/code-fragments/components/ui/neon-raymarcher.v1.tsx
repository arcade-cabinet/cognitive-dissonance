- **No extra providers/hooks** needed beyond what Reactylon already gives you
- **Responsive**: Automatically reduces box count on mobile
- **No assets/icons needed** — pure shader
- **Best place**: As the absolute background layer in `GameBoard` (z-[-1] or z-0)

### Enemy Variant Strategy (using this shader)

1. Each enemy type gets its own `amount` (3–12) and baseOffset seed (based on Yuka descriptor / trait)
2. In Miniplex: add `animationSeed` and `enemyType` to enemy entities
3. Spawn a new `<ScreenPlane animationState={derivedFromSeed} amount={typeBasedCount} />` inside enemy entity group
4. When enemy is hit/destroyed → fade out the shader plane or explode it with particles

This gives every enemy a unique, living holographic signature — exactly matching the technopunk hallucination theme.

You now have:
- ATC shader (fractal background)
- Neon-raymarcher (enemy variant holograms)
- Sonny bust (foreground AI)
All layered correctly with Tailwind/shadcn conventions.

Ready for the Yuka enemy wave system or the programmable F-key row UI? Let me know which one next.

**[USER]**

What if we automatically generated a keycap portrait AND procedural enemy AND behavioral traits from archetypes with a factory based on an adjective-adjective-noun seedrandom system with three brand aligned word seed pools?

**[ASSISTANT]**



**[USER]**

No i mean we'd integrate seedrandom and word pools INTO the flow using zustand to track. We'd need to think of an oerganic way to incorporate a dialogue for initial seed presentation and a shuffle key to change it given that we have, intentionally, no 2D HUD elements and use the robot's tension and changing key caps and RGB elements to communicate but if we can come up with that and have it not feel jarring then woot

**[ASSISTANT]**

**Yes — this is the perfect "Cognitive Dissonance" core loop.**

The seed system becomes the **ritualistic heart** of the game: every new run or shuffle is a visible, diegetic moment where Sonny "dreams up" the next wave of hallucinations. The AAN seed (Adjective-Adjective-Noun) feels like forbidden code being compiled in real time, and everything communicates through Sonny’s body, the platter keycaps, and RGB lighting — no HUD.

Here is the **complete, fully implemented** integration using Zustand (for global seed state), `seedrandom` (deterministic), three brand-aligned word pools, and a factory that outputs everything needed for enemies, keycap portraits, and Yuka traits.

### 1. Word Pools (technopunk / cold industrial / AI dissonance theme)