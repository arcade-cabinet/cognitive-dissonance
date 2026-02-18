Is this correct? What props does Engine accept (e.g., antialias, alpha)?

7. **How does Reactylon handle ParticleSystem?** Can we declare it as JSX or must it be imperative?

8. **How does Reactylon handle PointLight, SpotLight, HemisphericLight?** What is the JSX syntax?

Provide a COMPLETE working Reactylon component (50-100 lines) that demonstrates: a rotating cylinder with PBR material, a sphere with custom ShaderMaterial, a PointLight, a ParticleSystem, and a ref that is used in registerBeforeRender. This will serve as our API reference.

---

## GAP 5: Miniplex + Reactylon Integration

Our game uses Miniplex ECS for state (tension, coherence, patterns, enemies). The conversation assumed useEntity from miniplex-react would work inside Reactylon components.

### What we need:

1. Can miniplex-react's useEntity and useEntities be used inside a Reactylon component that also uses useScene? Or do we need a custom bridge?
2. If there is a conflict, provide a pattern for bridging Miniplex state into Reactylon's render loop (e.g., using Zustand as the bridge instead of Miniplex directly).
3. Provide a COMPLETE working example showing an entity with `tension: number` being created, updated in registerBeforeRender, and read by a sibling component.

---

## GAP 6: GSAP Animating Babylon.js Objects

The conversation uses patterns like: