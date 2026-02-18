gsap.to([top, bottom], {
  y: 0.052,
  duration: 1.8,
  stagger: {
    each: 0.22,
    onStart() { console.log("Element started"); },
    onComplete() { console.log("Element finished"); }
  }
});