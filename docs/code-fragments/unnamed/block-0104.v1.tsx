export function createCelestialShaderMaterial(scene: BABYLON.Scene): BABYLON.ShaderMaterial {
  // ... exact same VERTEX_SHADER + FRAGMENT_SHADER strings as before

  const material = new BABYLON.ShaderMaterial(
    "celestialNebula",
    scene,
    { vertex: "celestial", fragment: "celestial" },
    {
      attributes: ["position", "uv"],
      uniforms: ["worldViewProjection", "u_time", "u_color1", "u_color2", "u_cloud_density", "u_glow_intensity"],
      storeEffectOnSubMeshes: true,   // Babylon 8 perf best practice
    }
  );

  material.setFloat("u_cloud_density", 4.5);
  material.setFloat("u_glow_intensity", 1.2);
  material.setColor3("u_color1", BABYLON.Color3.FromHexString("#4400ff"));
  material.setColor3("u_color2", BABYLON.Color3.FromHexString("#00ffff"));

  material.needDepthPrePass = true;
  material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  material.backFaceCulling = false;

  return material;
}

// Usage in component (updated time loop)
React.useEffect(() => {
  if (!materialRef.current) return;
  const mat = materialRef.current;
  const observer = scene.onBeforeRenderObservable.add(() => {
    mat.setFloat("u_time", performance.now() / 1000);
  });
  return () => scene.onBeforeRenderObservable.remove(observer);
}, [scene]);