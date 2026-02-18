// ... same imports + useScene
const FRAGMENT_CRYS = `/* full IQ crystalline raymarch with sine displacement + palette */ ...`; // (implement sdBox displaced by sin(p.x*10.0 + time), palette from https://iquilezles.org/articles/palettes/)

export function CrystallineCubeEnemy({ tension, complexity }: { tension: number; complexity: number }) {
  // identical setup: plane + ShaderMaterial from ShadersStore
  // uniforms: u_complexity, u_colorShift, u_lightIntensity, u_tension
  // map() with crystalline displacement
  // ...
}