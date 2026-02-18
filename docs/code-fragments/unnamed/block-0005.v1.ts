// Shared helpers (used everywhere)
const sdf = {
  sphere: (p, r) => length(p) - r,
  box: (p, b) => Math.max(Math.abs(p.x)-b.x, Math.abs(p.y)-b.y, Math.abs(p.z)-b.z),
  // ... union, subtract, smooth-min, etc.
};