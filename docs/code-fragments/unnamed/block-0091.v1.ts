### What we need:

1. Does GSAP's to() work directly with BABYLON.Vector3 properties? Babylon.js Vector3 has .x, .y, .z as regular number properties — confirm this works.
2. Does gsap.to(pointLight, { intensity: 2.9 }) work with Babylon.js PointLight?
3. Does gsap.to(pbrMaterial, { roughness: 0.5 }) work?
4. Provide a COMPLETE working example of GSAP animating a Babylon.js mesh position, rotation, and material property inside a Reactylon component.
5. Confirm CustomEase, MotionPathPlugin, and Flip all work with Babylon.js objects (or explain workarounds).

---

## GAP 7: Next.js 15 App Router + Babylon.js + Reactylon SSR

Babylon.js requires window, document, and WebGL context. Next.js App Router renders components on the server first.

### What we need:

1. The COMPLETE next.config.mjs that handles Babylon.js + Reactylon + GSAP (any transpilePackages or webpack config needed?)
2. The COMPLETE app/layout.tsx with proper metadata and body setup
3. The pattern for dynamically importing the 3D scene component with ssr: false: