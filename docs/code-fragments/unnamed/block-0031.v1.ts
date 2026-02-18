#### Integration in `SonnyBust.tsx` (the ritual is now purely visual)

In the `useBeforeRender` loop, when `useSeedStore` detects a new seed (via a subscription or flag), trigger the private ritual:

- Sonny’s core pulses in a hidden pattern.
- Keycaps ripple in a non-readable sequence.
- Neck twitches.
- RGB shifts subtly.
- Then he rotates back to the board.

No text. No input box. Purely organic.

---

**My final recommendation**: Bury the seed.  
It makes the game feel more intimate, mysterious, and true to the theme. The “forbidden code” feeling comes from watching Sonny react to something you can’t see — that’s stronger than reading words on screen.

If you want the full updated `SonnyBust.tsx` with the buried-seed ritual coded (including the visual glitch on shuffle), just say **“full buried seed version”** and I’ll give you the complete file.

This keeps the magic intact while making the flow feel completely natural.  

What do you think — shall we lock in the buried version and build the next piece (Yuka enemy spawner tied to the hidden seed)?

**[USER]**

Yeah I like it. We don't even NEED a shuffle then < if he plan is buttons + space + buttons with new (Play) on one side and fast forward (continue) on the other then new game is effectively the shuffle

**[ASSISTANT]**

**Perfect. Buried seed + simplified keycap layout is cleaner, more immersive, and exactly right for the theme.**

No visible words. No extra shuffle button.  
The left keycap = **New Game** (generates fresh hidden seed + ritual)  
Center spacebar = **Pause**  
Right keycap = **Continue** (resumes last seed)  

Everything stays 100% diegetic. The player only ever sees Sonny react — the machine is keeping its own secrets.

### Final Keycap Layout on the Lazy-Susan Platter
- 6 keycaps left of spacebar (decorative + tension indicators)
- Center keycap = **Pause** (glowing when paused)
- 6 keycaps right of spacebar (decorative + tension indicators)
- **Special interactive keys**:
  - Far-left keycap = **New Game** (Play symbol portrait, pulses when ready)
  - Far-right keycap = **Continue** (Fast-forward symbol portrait)

### Complete Implementation

Here are the **three updated files** you need. Replace your existing ones.

#### 1. `store/seed-store.ts` (buried seed only)