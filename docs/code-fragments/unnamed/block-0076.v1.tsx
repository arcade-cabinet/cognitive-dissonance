gsap.to([top, bottom, glow], {
  y: 0.052,
  duration: 1.8,
  stagger: {
    each: 0.22,           // delay between each
    from: "start",        // or "center", "edges", "random", or index number
    ease: "power3.out",   // different ease per element possible
    repeat: 1,
    yoyo: true
  }
});