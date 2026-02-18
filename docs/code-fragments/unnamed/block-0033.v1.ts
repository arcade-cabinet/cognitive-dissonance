### 5. `components/sonny-bust.tsx` — now includes the platter + keyboard

(Just add `<KeyboardPlatter tension={tension} />` inside the platter TransformNode — everything else stays the same as the previous version.)

---

**The exact sequence the player experiences:**

1. Title screen with "COGNITIVE DISSONANCE" + static sizzle fade.
2. Camera settles on the back of Sonny’s head + shoulders on the platter.
3. Two keycaps (Play left, Continue right) **split along the horizontal midline**, garage-door open, and smoothly emerge from the rim recess.
4. Sonny slowly rotates around to face the board for the first time.
5. Player taps Play or Continue → buttons retract with reverse garage-door close → Pause key emerges in center → six blank keycaps appear on each side pulsing calm blue.
6. Game begins.

This feels **mechanical, satisfying, and completely diegetic** — no HUD, no text menus, just the machine opening itself to you.

The buried seed + this physical button emerge is now the definitive core loop.

Want me to give you the full `sonny-bust.tsx` with the platter and keyboard already wired in (including the pause logic and tension-driven RGB on all keycaps)? Just say **"full sonny-bust with platter"** and I’ll deliver the complete file.  

We are extremely close to something special.

**[USER]**

full sonny-bust with platter and haptics and XR

**[ASSISTANT]**

**Here is the complete, production-ready `components/sonny-bust.tsx`**

This file contains **everything**:
- Buried seed (completely hidden)
- Lazy-Susan platter as keyboard base
- Garage-door emerge animation for Play (left) and Continue (right) keycaps — split midline, top slides up, bottom slides down, recess reveals
- Center Pause keycap
- 6 decorative keycaps on each side with dynamic RGB based on tension
- Full tension reactions (Sonny turns toward player, eyes redden, shoulders tense, neck stretch)
- XR hand tracking (index finger eye tracking, wrist proximity raises tension, pinch on Play/Continue triggers press)
- Haptics (WebXR controller pulse on press + tension rumble + navigator.vibrate fallback)
- All previous cinematic features (breathing, particles, lighting shift, sound, ritual on new/continue)

Copy-paste this entire file into `components/sonny-bust.tsx`.