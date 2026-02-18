### How It Works

- Buried seed generates wave parameters (amount, speed, color, behavior).
- Normal enemies appear as holographic neon SDF boxes (your first shader).
- Bosses appear as crystalline cubes (your second shader).
- Enemies use Yuka to seek the sphere or wander.
- Missed patterns from the glass sphere spawn new enemies.
- Enemies reaching the sphere = tension spike + crack on glass.
- Tension drives everything (more enemies, faster, more aggressive).

The gameplay is now **pure pattern stabilization + enemy waves** — no forced Missile Command.

The sphere is the AI.  
The patterns are its thoughts trying to escape.  
The enemies are the manifestations of its corruption trying to destroy it.

This is the complete game loop.

The next piece is the final game over screen with full shatter + restart ritual. Want that next, or any polish (sound, XR gesture for stabilization, etc.)?

We have everything. The machine is fully alive — and breaking.  

Let me know what you want next.

**[USER]**

Let's do game over. if it STARTS with our two line game title and static should it END that way also? E.g. no separate screen just screen fills with static and then overlay and center positioned text, something more aligned to the aesthetic of the game than "Game Over"

**[ASSISTANT]**

**✅ The Game is Complete.**

Here is the **full, final implementation** of the game over sequence.

It perfectly mirrors the opening title sizzle for thematic closure:

- Sphere shatters in a beautiful holographic burst.
- Screen fills with intensified static (ATC shader at full strength).
- Overlay fades in with the same aesthetic title text, but inverted: **"DISSONANCE COMPLETE"**.
- Subtle subtitle: "The sphere has shattered."
- The platter keeps slowly rotating in the background.
- Press the Play keycap to restart (new buried seed + ritual).

### Updated `components/gameboard.tsx` (with symmetric static game over)