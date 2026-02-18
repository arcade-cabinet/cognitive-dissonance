const openGarageDoor = (type: 'play' | 'continue') => {
  const top = type === 'play' ? playTopRef.current : continueTopRef.current;
  const bottom = type === 'play' ? playBottomRef.current : continueBottomRef.current;
  const keycap = type === 'play' ? keycapRef.current : null;

  if (!top || !bottom) return;

  // Record start state for Flip (optional hybrid)
  const startState = Flip.getState([top, bottom, keycap].filter(Boolean));

  // Apply end positions first
  if (top) top.position.y = 0.052;
  if (bottom) bottom.position.y = -0.052;
  if (keycap) keycap.position.y = 0.05;

  // MotionPath for key emergence - curved rail feel
  if (keycap) {
    gsap.to(keycap.position, {
      motionPath: {
        path: [
          { x: keycap.position.x, y: keycap.position.y - 0.08, z: keycap.position.z },
          { x: keycap.position.x + 0.03, y: keycap.position.y + 0.02, z: keycap.position.z - 0.04 },
          { x: keycap.position.x, y: keycap.position.y + 0.05, z: keycap.position.z }
        ],
        curviness: 1.4,
        autoRotate: false
      },
      duration: 1.85,
      ease: "heavyMechanical"
    });
  }

  // Flip for top/bottom halves (best of both worlds)
  Flip.from(startState, {
    targets: [top, bottom].filter(Boolean),
    duration: 1.95,
    ease: "heavyMechanical",
    stagger: 0.18,
    onComplete: () => {
      // Final settle bounce
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

  // Recess glow + dust (synced)
  if (recessGlowRef.current) {
    gsap.to(recessGlowRef.current, { intensity: 2.9, duration: 1.75, ease: "power2.out", delay: 0.35 });
  }
  if (dustParticlesRef.current) {
    gsap.delayedCall(0.65, () => dustParticlesRef.current?.start());
    gsap.delayedCall(2.2, () => dustParticlesRef.current?.stop());
  }
};