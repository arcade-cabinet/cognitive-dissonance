const openGarageDoor = (type: 'play' | 'continue') => {
  const top = type === 'play' ? playTopRef.current : continueTopRef.current;
  const bottom = type === 'play' ? playBottomRef.current : continueBottomRef.current;

  if (!top || !bottom) return;

  const tl = gsap.timeline({
    defaults: { duration: 1.95 }
  });

  // Top half: heavy lift (slow start, strong acceleration)
  tl.to(top.position, { 
    y: 0.052, 
    ease: "heavyLift" 
  }, 0);

  // Bottom half: delayed mechanical settle (stagger + overshoot)
  tl.to(bottom.position, { 
    y: -0.052, 
    ease: "mechSettle" 
  }, 0.22); // 220ms stagger for weight difference

  // Gear-like micro rotation during slide (subtle wobble)
  tl.to(top.rotation, { 
    x: -0.095, 
    duration: 1.45, 
    ease: "gearWobble",
    yoyo: true,
    repeat: 1 
  }, 0.12);

  tl.to(bottom.rotation, { 
    x: 0.095, 
    duration: 1.45, 
    ease: "gearWobble",
    yoyo: true,
    repeat: 1 
  }, 0.34);

  // Recess glow ramp (slow build for depth)
  if (recessGlowRef.current) {
    tl.to(recessGlowRef.current, { 
      intensity: 2.9, 
      duration: 1.75, 
      ease: "power2.out" 
    }, 0.35);
  }

  // Dust burst from recess (mechanical "whoosh")
  if (dustParticlesRef.current) {
    tl.call(() => dustParticlesRef.current?.start(), [], 0.65);
    tl.call(() => dustParticlesRef.current?.stop(), [], 2.2);
  }
};