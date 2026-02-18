gsap.registerPlugin(CustomEase);

// 1. Heavy Start + Acceleration (for top half - feels like lifting weight)
CustomEase.create("heavyLift", "M0,0 C0.08,0 0.22,0.15 0.38,0.68 C0.55,0.95 0.72,1 1,1");

// 2. Mechanical Settle with Overshoot (for bottom half - heavier drop)
CustomEase.create("mechSettle", "M0,0 C0.12,0 0.25,0.62 0.42,0.82 C0.58,1.08 0.75,0.96 1,1");

// 3. Gear Micro Wobble (for subtle rotation during slide)
CustomEase.create("gearWobble", "M0,0 C0.18,0.35 0.35,0.72 0.52,0.48 C0.68,0.25 0.82,0.9 1,1");