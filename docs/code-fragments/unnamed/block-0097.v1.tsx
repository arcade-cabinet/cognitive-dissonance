import gsap from 'gsap';
import { CustomEase, MotionPathPlugin, Flip } from 'gsap/all';
gsap.registerPlugin(CustomEase, MotionPathPlugin, Flip);

export function GSAPExample({ meshRef }: { meshRef: React.RefObject<BABYLON.Mesh> }) {
  React.useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const mat = mesh.material as BABYLON.PBRMaterial;

    gsap.to(mesh.position, { y: 0.048, duration: 1.4, ease: "power3.out" });
    gsap.to(mesh.rotation, { x: -0.08, duration: 1.6, ease: CustomEase.create("custom", "M0,0 C0.23,0.01 0.32,1 1,1") });
    gsap.to(mat, { roughness: 0.5, duration: 2.0 });
    gsap.to(pointLight, { intensity: 2.9, duration: 1 });

    return () => gsap.killTweensOf([mesh.position, mesh.rotation, mat, pointLight]);
  }, [meshRef]);

  return null;
}