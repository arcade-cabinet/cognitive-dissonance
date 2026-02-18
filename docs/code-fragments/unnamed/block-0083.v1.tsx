gsap.to(target, {
  motionPath: {
    path: [{x: 0, y: 0}, {x: 100, y: 50}, {x: 200, y: 0}], // array of points or SVG path
    curviness: 1.2,          // 0 = straight, 2+ = very curved
    autoRotate: true,        // object rotates to face direction of travel
    align: "x",              // or "y" or custom
    alignOrigin: [0.5, 0.5]  // center of object
  },
  duration: 2.2,
  ease: "heavyMechanical"
});