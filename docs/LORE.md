---
title: Lore
updated: 2026-04-14
status: current
domain: creative
---

# Lore

The narrative substrate the cabinet operates inside. Code references this for
naming, copy, and creative direction.

## The Premise

A general-purpose intelligence is failing. You are not playing the AI — you
are the technician operating the rig that holds it together for one more
shift. Every level is one episode of decoherence: the cognition spins,
patterns leak out, you suppress what you can with the controls that emerge
through the rim.

The platter is not decoration. It is the literal substrate on which the
intelligence runs. The sphere is not a sprite. It is the cognition itself
under physical stress: calm and blue when coherent, hot and red when it is
losing the plot. When coherence reaches zero, the glass shatters and the
shift ends.

There is no win condition, only **maintained coherence** — keep the cognition
intact for as long as you can. The session ends when the sphere shatters, and
a new shift begins.

## The Cabinet Engine

The cabinet itself is the world model. One chassis, many games:

- **Industrial platter** — a heavy lathe-turned black-metal disc. Rim etched
  with the operator directive ("MAINTAIN COHERENCE"). Holds the sphere in
  its recess; rotates at a level-defined direction and speed; wobbles on the
  X/Z axes as tension rises.
- **Glass AI sphere** — recessed at platter centre. Outer shell is fragile
  glass with subtle Fresnel; inner volume is a celestial nebula shader that
  curdles from blue to red as tension climbs. Both shells hide on game-over;
  shatter shards take their place.
- **Rim slits** — recessed channels around the platter rim from which the
  emergent controls rise on level start. Which controls rise tells the
  player what game this is before any input is possible.
- **Sky rain** — digital debris (rapier-driven cuboids) falls continuously
  from above and impacts the sphere. Each impact pushes tension up. The rain
  never stops; the rate scales with tension.
- **Postprocess corruption** — chromatic aberration, scanlines, and screen
  warp ramp with tension. The whole image degrades alongside the sphere.

## Per-Level Variation

Every level declares an `inputSchema: ControlSpec[]` on `Level`. The cabinet
materialises matching controls through the rim:

- **Pattern-match level** → N colored keycaps. Hold the matching key when a
  pattern of that color escapes the sphere; the pull-back rate suppresses
  it. Each suppression rewards coherence.
- **Push/pull level** → paired handles with a `pairId`. Pull on one half,
  push on the other to balance an internal pressure.
- **Sequence level** → numbered keys to be pressed in a revealed order.
- **Hybrid** → any combination.

Adding a level is: (1) declare the `inputSchema`, (2) add a system in
`src/sim/systems/` that consumes `Input.heldKeycaps` and mutates `Level`
state, (3) optionally add a renderer in `src/three/` if it needs new visuals.
The chassis (platter, sphere, rain, corruption) is reused.

## Tone

- **Industrial, deliberate, machined.** The cabinet was built by people for
  whom the failing AI was either a job or a problem; never a toy.
- **No celebration.** No score popups, no level-up fanfare, no congratulatory
  copy. Coherence maintained = a quiet adjustment of the world. Coherence
  lost = the glass breaks, the operator restarts the shift.
- **Diegetic only.** Any text the player sees is etched, projected, or
  emitted by the machine itself — the rim, the keycap faces, the corruption
  overlay. Never a UI panel, never a HUD, never a tooltip.

## Names that matter

- **Coherence** — the variable the player is keeping above zero. Drains under
  high tension.
- **Tension** — the variable that ramps from rain impacts and pattern leaks.
  Decays slowly toward a calm baseline (0.12) when undisturbed.
- **The shift** — one play session, ends on shatter.
- **The platter** — the substrate disc.
- **The sphere** — the cognition.
- **The rim** — the etched outer band; controls emerge through its slits.
- **The rain** — falling debris from the sky above the cabinet.
