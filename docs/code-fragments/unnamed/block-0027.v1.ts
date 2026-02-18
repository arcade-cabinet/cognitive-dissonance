Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?
Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

**[ASSISTANT]**

Here is a **complete, production-ready integration** of your `neon-raymarcher.tsx` shader component as the animated background layer for enemy variants in your "Cognitive Dissonance" missile-command-style game.

### Why this shader works beautifully for enemy variants

- The **holographic iridescent green** look with dark base + rim glow + atmospheric fog already feels like floating, glitching, technopunk data ghosts / hallucinations.
- The **multiple animated SDF boxes** that orbit, rotate and merge smoothly are perfect for representing different hallucination types:
  - Slow-moving, large boxes → "stable" but heavy hallucinations
  - Fast, jittery small boxes → chaotic / splitting variants
  - Merging clusters → boss-level amalgamations
- The **Yuka** integration is trivial: each enemy entity gets a unique `AnimationState` seed (phase, speed multipliers) based on its descriptor (trait, type, difficulty).

### Final Integration Plan (shadcn + Tailwind + TypeScript)

#### Project Setup Check / Instructions

If your project does **not** yet have shadcn + Tailwind + TypeScript: