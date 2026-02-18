const openGarageDoor = (type: 'play' | 'continue') => {
  const top = type === 'play' ? playTopRef.current : continueTopRef.current;
  const bottom = type === 'play' ? playBottomRef.current : continueBottomRef.current;

  if (!top || !bottom) return;

  const tl = gsap.timeline({
    defaults: { duration: 1.95 }
  });

  // Top half - heavy start, strong acceleration
  tl.to(top.position, { 
    y: 0.052, 
    duration: 1.95, 
    ease: "heavyStart" 
  }, 0);

  // Bottom half - delayed start, different curve
  tl.to(bottom.position, { 
    y: -0.052, 
    duration: 1.85, 
    ease: "mechanicalSettle" 
  }, 0.22); // 0.22s stagger for weight difference

  // Subtle gear-like rotation during slide
  tl.to(top.rotation, { 
    x: -0.092, 
    duration: 1.4, 
    ease: "gearMicro",
    yoyo: true,
    repeat: 1 
  }, 0.15);

  tl.to(bottom.rotation, { 
    x: 0.092, 
    duration: 1.4, 
    ease: "gearMicro",
    yoyo: true,
    repeat: 1 
  }, 0.37);

  // Recess glow ramp (slow build)
  if (recessGlowRef.current) {
    tl.to(recessGlowRef.current, { 
      intensity: 2.9, 
      duration: 1.7, 
      ease: "power2.out" 
    }, 0.4);
  }

  // Dust burst from recess (mechanical "whoosh")
  if (dustParticlesRef.current) {
    tl.call(() => dustParticlesRef.current?.start(), [], 0.65);
    tl.call(() => dustParticlesRef.current?.stop(), [], 2.1);
  }
};