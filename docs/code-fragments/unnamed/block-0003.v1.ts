class TorsoModule extends THREE.Group {
    constructor() {
      super();
      this.position.y = -0.58;
      // Base: Blended box-sphere for broad form
      const baseGeo = THREE.BufferGeometryUtils.mergeGeometries([new THREE.BoxGeometry(1.05, 1.6, 0.35), new THREE.SphereGeometry(0.52, 32, 32)]);
      sculptGeo(baseGeo, (v) => {
        // Broaden chest: Minimal taper
        if (v.y > 0.3) v.x *= lerp(0.24, 0.12, ss(0.3, 0.8, v.y)); // Neck narrow
        else if (v.y > -0.3) v.x *= 0.52; // Wide chest
        else v.x *= lerp(0.52, 0.38, ss(-0.3, -0.9, v.y)); // Gentle waist
        // Depth: Full throughout
        v.z *= lerp(0.18, 0.14, ss(-0.9, 0.8, v.y));
        // Pec grooves, shoulder rounds... (expand similar to original but amplified)
        // Back cutout: Depress for spine
        if (v.z < -0.06 && Math.abs(v.x) < 0.22 && v.y > -0.7) v.z += gauss(v.y, -0.35, 0.25) * 0.04;
        // Central slot: Subtract
        if (Math.abs(v.x) < 0.06 && v.y > -0.45 && v.y < -0.05 && v.z > 0.14) v.z -= 0.025;
      });
      const shell = new THREE.Mesh(baseGeo, shellMat.clone({ clearcoat: 0.4 }));
      this.add(shell);
      // Spine: Extended segments
      const spineGroup = new THREE.Group(); spineGroup.position.z = -0.03;
      for (let i = 0; i < 14; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.03 - i*0.001, 0.04 - i*0.001, 0.06, 10), i%2 ? darkMetal : boneMat);
        seg.position.y = -0.48 + i*0.08;
        spineGroup.add(seg);
      }
      this.add(spineGroup);
      // Ribs: Torus arcs...
      // Core: Emissive cylinder in slot
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 12), eyeCoreMat.clone());
      core.position.set(0, -0.25, 0.15);
      this.add(core);
      // Seam: Vertical box...
    }
  }
  // Instantiate: robot.add(new TorsoModule());