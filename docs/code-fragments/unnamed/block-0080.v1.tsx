const openGarageDoor = (type: 'play' | 'continue') => {
  const top = type === 'play' ? playTopRef.current : continueTopRef.current;
  const bottom = type === 'play' ? playBottomRef.current : continueBottomRef.current;
  const keycap = type === 'play' ? keycapRef.current : null; // for Play key

  if (!top || !bottom) return;

  // Record start state (closed)
  const startState = Flip.getState([top, bottom, keycap].filter(Boolean));

  // Apply end state (open)
  if (top) top.position.y = 0.052;
  if (bottom) bottom.position.y = -0.052;
  if (keycap) keycap.position.y = 0.05; // emerge key

  // Record end state
  const endState = Flip.getState([top, bottom, keycap].filter(Boolean));

  // Flip with advanced config
  Flip.from(startState, {
    targets: [top, bottom, keycap].filter(Boolean),
    duration: 1.95,
    ease: "heavyMechanical",           // your custom heavy start
    stagger: 0.18,                     // bottom lags slightly
    absolute: true,                    // ignore parent transforms during flip
    onComplete: () => {
      // Final settle micro-bounce
      gsap.to([top, bottom].filter(Boolean), {
        y: "+=0.004",
        duration: 0.35,
        ease: "back.out(1.6)",
        yoyo: true,
        repeat: 1,
        stagger: 0.06
      });
    }
  });

  // Recess glow ramp (synced with Flip)
  if (recessGlowRef.current) {
    gsap.to(recessGlowRef.current, {
      intensity: 2.9,
      duration: 1.75,
      ease: "power2.out",
      delay: 0.35
    });
  }

  // Dust burst at peak opening
  if (dustParticlesRef.current) {
    gsap.delayedCall(0.65, () => dustParticlesRef.current?.start());
    gsap.delayedCall(2.2, () => dustParticlesRef.current?.stop());
  }
};