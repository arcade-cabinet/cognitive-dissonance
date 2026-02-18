const openGarageDoor = (type: 'play' | 'continue') => {
  const top = type === 'play' ? playTopRef.current : continueTopRef.current;
  const bottom = type === 'play' ? playBottomRef.current : continueBottomRef.current;

  if (!top || !bottom) return;

  const tl = gsap.timeline();

  // Main garage door stagger (top starts first, bottom lags)
  tl.to([top.position, bottom.position], {
    y: (i) => i === 0 ? 0.052 : -0.052,   // top goes up, bottom goes down
    duration: 1.95,
    ease: "heavyMechanical",
    stagger: {
      each: 0.22,          // bottom starts 220ms later
      from: "start"
    }
  });

  // Gear-like micro-rotation stagger
  tl.to([top.rotation, bottom.rotation], {
    x: (i) => i === 0 ? -0.095 : 0.095,
    duration: 1.45,
    ease: "gearWobble",
    yoyo: true,
    repeat: 1,
    stagger: {
      each: 0.18,
      from: "start"
    }
  }, "-=1.6"); // overlap with main animation

  // Recess glow ramp (starts after top begins moving)
  if (recessGlowRef.current) {
    tl.to(recessGlowRef.current, {
      intensity: 2.9,
      duration: 1.75,
      ease: "power2.out"
    }, "-=1.4");
  }

  // Dust burst (starts at peak opening)
  if (dustParticlesRef.current) {
    tl.call(() => dustParticlesRef.current?.start(), [], "-=0.8");
    tl.call(() => dustParticlesRef.current?.stop(), [], "+=1.4");
  }

  // Final settle micro-bounce on both halves
  tl.to([top.position, bottom.position], {
    y: "+=0.004",
    duration: 0.35,
    ease: "back.out(1.4)",
    yoyo: true,
    repeat: 1,
    stagger: 0.08
  }, "-=0.6");
};