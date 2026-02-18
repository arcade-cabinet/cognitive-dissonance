# Design — Turn 128

**Topics**: glass-sphere, platter, pattern-stabilization, gsap, shaders, babylon, tension, seed, controls, r21dev, csp

---

**✅ Final Optimized Prompt for r21dev (Pure Code, No GLB)**

Copy and paste this **exactly** into r21dev:

---

**Prompt for r21dev:**

```
Generate a COMPLETE, self-contained Babylon.js Reactylon component code for a heavy industrial black metal platter.

The output must be pure Babylon.js / Reactylon code (no GLB file, no imported model, no external assets). All geometry, materials, animations, and interactions must be created in code using Babylon.js primitives (Cylinder, Torus, Box, Sphere, etc.) and Animation system. The code must be 100% CSP-safe — no 'eval', no 'new Function', no dynamic code generation of any kind.

CRITICAL CONSTRAINTS — DO NOT VIOLATE ANY OF THESE:
- The platter MUST lie perfectly flat on the ground at all times. DO NOT make it vertical, tilted, or floating.
- The platter can ONLY rotate smoothly around its invisible central vertical axis. DO NOT allow any vertical movement, lifting, tilting, or floating. It must feel extremely heavy and completely fixed in position.
- The rim must be extremely thick (minimum 18cm visible depth from the player side). DO NOT make a thin rim.
- On the side facing the player, a precise horizontal slit must be able to emerge from the thick black rim. When activated, a satisfying mechanical garage-door effect must occur: the top half of the rim section slides upward and smoothly recedes into the platter depth, the bottom half slides downward and smoothly recedes into the platter depth, revealing visible internal mechanical depth and subtle blue RGB lighting inside the recess. DO NOT make this instantaneous — it must feel deliberate and mechanical with slight resistance and precise alignment.
- From this revealed recess, a single customizable keyboard key must smoothly emerge with realistic mechanical process — deliberate, satisfying, not instantaneous (gears, slight resistance, precise alignment). The keycap is initially set to a glowing Play symbol (▶), with strong RGB lighting surrounding the key so the recess remains mostly hidden but emits a soft blue-to-cyan glow. Reference the exact mechanical style and button press animation of this key component: https://21st.dev/community/components/theutkarshmail/bluetooth-key/default — but adapted to heavy black metal industrial aesthetic with cool blue RGB accents.
- Separately, a lever component must emerge from another section of the rim using the exact same garage-door split mechanism. The recess for the lever must remain visibly lit with RGB glow. Reference the exact mechanical style and lever switch animation of this component: https://21st.dev/community/components/theutkarshmail/lever-switch/default — adapted to heavy black metal industrial aesthetic with cool blue RGB accents.
- In the exact center of the platter is a recessed circular track. Sitting inside this track is a large transparent glass sphere (diameter exactly 52cm), rendered as high-quality PBR glass with refraction, thin-film interference, and visible thickness. Inside the glass sphere is the exact celestial nebula shader effect from this reference: https://21st.dev/community/components/dhileepkumargm/celestial-sphere-shader/default. The internal effect starts with calm confident blue tones, transitions through yellows and greens, and finally to violent reds as tension increases, with increasing static, jitter, bounce, and corruption inside the sphere.

COMMON PITFALLS TO AVOID:
- Do not make the platter vertical or standing up.
- Do not allow any vertical movement, floating, or tilting of the platter.
- Do not make the rim thin — it must be thick enough to show visible internal depth when the slit opens.
- Do not make the garage-door animation instantaneous or cartoonish — it must feel heavy, mechanical, and satisfying with slight resistance.
- Do not place the glass sphere anywhere except the exact center recessed track.
- Do not add any text, HUD elements, or extra objects.
- Do not make the glass sphere opaque — it must be transparent with visible internal shader effect.
- Do not ignore the reference URLs — match their mechanical style and button/lever motion as closely as possible while adapting to black metal industrial aesthetic.
- Do not embed any scripts or dynamic code — the generated code must be 100% CSP-safe for strict Content Security Policy that blocks 'eval'.

Overall composition: dark industrial void background, dramatic rim lighting only, focus on the platter and sphere, cinematic Babylon.js render, ultra-realistic mechanical details, satisfying physical motion, high detail, 8K, octane render quality, subtle dust particles on platter surface, perfect symmetry, mechanical precision.

Generate the full Reactylon component code with named refs for all moving parts (platter, rim, track, keyTopHalf, keyBottomHalf, leverTopHalf, leverBottomHalf, keycap, lever) so they can be easily animated in code.

Prioritize mechanical realism and satisfying animation potential.
```

---

This prompt is now the most explicit possible for r21dev:

- It explicitly says **"Generate the full Reactylon component code"** (pure code, no GLB).
- It lists **all libraries** (Babylon.js, Reactylon).
- It includes **CSP-safe warning**.
- It references your three exact components by URL.
- It warns about every common pitfall.

Paste this into r21dev.

Once you have the generated code, I can integrate it into your existing `ai-sphere.tsx` and wire the animations, RGB pulsing, tension, buried seed, and pattern stabilization.

The platter is the last major visual piece. Once we have it, the game is visually complete.

Let me know how the generations turn out!  

We’re almost there.