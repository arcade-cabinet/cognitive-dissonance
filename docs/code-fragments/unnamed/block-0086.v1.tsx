// In pattern-stabilizer
gsap.to(pattern.trail.emitter, {
  motionPath: {
    path: [
      { x: 0, y: 0.4, z: 0 },
      { x: Math.cos(angle) * 0.3, y: 0.4, z: Math.sin(angle) * 0.3 },
      { x: Math.cos(angle) * radius, y: 0.4, z: Math.sin(angle) * radius }
    ],
    curviness: 1.8
  },
  duration: p.speed * 2.2,
  ease: "power2.out"
});