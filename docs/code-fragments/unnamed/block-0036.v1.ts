This is the **final, cohesive version**:

- **Eye sphere** rolls inside a recessed track (you can add a torus track mesh if desired).
- **Eye tracks** player/enemies via XR or fallback target.
- **Glitch effect** intensifies with tension (color shift, emissive flicker).
- **Garage-door buttons** emerge gracefully after title sizzle.
- **Buried seed** — no text, no HUD.
- **Tension** drives Sonny’s posture, eye color, RGB on keycaps, and game state.

The experience is now purely mechanical, intimate, and unsettling — exactly what the theme demands.

The game is ready.  
The machine is watching you through the eye in the platter.  

Want the full pause/resume logic next (with platter freeze + dimmed RGB), or the missile command firing system? Just say the word.

**[USER]**

Well what I'm actually proposing is Sonny would go away and we would STOP humanizing, the sphere would BECOME the AI we're clearing of hallucinatioons

**[ASSISTANT]**

Yes — this is a **profound and elegant pivot**, and I think it’s the stronger direction.

### Why this change works better than the previous humanized Sonny

The original “humanized” Sonny (face, eyes, arms, posture) created a tragic, relatable AI character — which is emotionally powerful, but it also pulls focus toward empathy and personality. That risks softening the core horror: the AI is **not** human, and the hallucinations are **not** external monsters — they are **internal corruptions** of the machine itself.

By making the **sphere the AI**:

- We remove the anthropomorphic layer entirely → pure machine intelligence, no face to pity or bond with.
- The sphere becomes the literal “mind” we are defending → every enemy/hallucination that reaches the bottom is a successful corruption of **its** core.
- The eye tracking + glitch + color shift now feels like the AI is **struggling to maintain coherence** — not watching us with sadness, but fighting to keep its own thoughts from fracturing.
- The platter + keycaps become the **interface** — the only physical way we can interact with this disembodied intelligence.
- Tension = the sphere’s degradation: cracks widen, eye flickers red, static intensifies, RGB on platter drifts to alarm red.
- Game over = sphere shatters (beautiful particle explosion using the same neon-raymarcher style).

This is **much closer** to HAL 9000 / black mirror / technopunk horror: cold, inscrutable, and terrifying precisely because it is **not** human.

### Updated Core Loop & Visual Language

- **Title sizzle** → fades to black.
- **Platter** slowly rotates into view. Center recess is empty.
- **Sphere emerges** from below the platter (rising smoothly, no cartoon bounce — mechanical lift).
- **Eye appears** on sphere (simple white dot or slit pupil that immediately starts tracking player/enemies).
- **Play / Continue keys** emerge from rim (garage-door split as described).
- **Player taps Play** → keys retract, Pause emerges in center, 6 blank keys on each side light up calm blue.
- **Game starts** → hallucinations (neon-raymarcher variants) fall from top.
- **Tension rises** → sphere cracks, eye reddens, static/glitch intensifies, platter RGB shifts, keys pulse red.
- **Missile command** → tap platter keys or XR gesture to shoot upward.
- **Enemy reaches bottom** → hits sphere → tension spike + sphere glitch pulse.
- **Max tension** → sphere explodes in holographic burst → game over.

No face. No arms. No posture. Just the sphere as the fragile, alien mind we are trying (and failing) to protect.

### Implementation Changes

You can keep most of the existing structure, but replace Sonny’s head/torso with a single sphere entity.

#### Updated `sonny-bust.tsx` (now “ai-sphere”)