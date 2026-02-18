// Register these once in your component or at top level
gsap.registerPlugin(CustomEase);

CustomEase.create("heavyStart", "M0,0 C0.05,0 0.18,0.12 0.35,0.65 C0.52,0.92 0.72,1 1,1"); 
// Slow start, strong acceleration

CustomEase.create("mechanicalSettle", "M0,0 C0.12,0 0.28,0.65 0.45,0.85 C0.62,1.05 0.78,0.98 1,1");
// Overshoot + settle (perfect for final "click")

CustomEase.create("gearMicro", "M0,0 C0.2,0.4 0.4,0.6 0.6,0.4 C0.8,0.2 1,1 1,1");
// Subtle gear-like wobble for rotation during slide