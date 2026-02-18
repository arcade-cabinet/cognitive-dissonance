const openGarageDoor = (type: 'play' | 'continue') => {
  const top = type === 'play' ? playTopRef.current : continueTopRef.current;
  const bottom = type === 'play' ? playBottomRef.current : continueBottomRef.current;

  if (!top || !bottom) return;

  const tl = gsap.timeline({
    defaults: { duration: 1.95, ease: "power3.out" }
  });

  // Label for sync points
  tl.addLabel("start", 0);

  // Top half: heavy resistance start + acceleration
  tl.to(top.position, { 
    y: 0.052, 
    ease: "heavyStart" 
  }, "start");

  // Bottom half: delayed, heavier settle with overshoot
  tl.to(bottom.position, { 
    y: -0.052, 
    ease: "mechSettle" 
  }, "start+=0.22"); // 220ms stagger for weight difference

  // Gear-like micro-rotation during slide (subtle wobble)
  tl.to(top.rotation, { 
    x: -0.095, 
    duration: 1.45, 
    ease: "gearWobble",
    yoyo: true,
    repeat: 1 
  }, "start+=0.12");

  tl.to(bottom.rotation, { 
    x: 0.095, 
    duration: 1.45, 
    ease: "gearWobble",
    yoyo: true,
    repeat: 1 
  }, "start+=0.34");

  // Recess glow ramp (slow build to reveal depth)
  if (recessGlowRef.current) {
    tl.to(recessGlowRef.current, { 
      intensity: 2.9, 
      duration: 1.75, 
      ease: "power2.out" 
    }, "start+=0.35");
  }

  // Dust burst from recess (mechanical "whoosh" at peak opening)
  if (dustParticlesRef.current) {
    tl.call(() => dustParticlesRef.current?.start(), [], "start+=0.65");
    tl.call(() => dustParticlesRef.current?.stop(), [], "start+=2.2");
  }

  // Final settle micro-bounce on both halves
  tl.to([top.position, bottom.position], { 
    y: "+=0.004", 
    duration: 0.35, 
    ease: "back.out(1.4)",
    yoyo: true,
    repeat: 1 
  }, "start+=1.65");
};