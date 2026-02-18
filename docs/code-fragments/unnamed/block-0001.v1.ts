class HeadModule extends THREE.Group {
    constructor() {
      super();
      this.scale.set(0.88, 0.82, 0.88); // Wider, shorter than original
      const baseGeo = new THREE.IcosahedronGeometry(0.24, 3);
      sculptGeo(baseGeo, (v, ox, oy, oz) => {
        // Dome: Gentle peak
        if (oy > 0.18) v.y += gauss(oy, 0.24, 0.06) * 0.02;
        // Forehead: Smoother slope
        if (oy > 0.05 && oy < 0.15 && oz > 0.12) v.z += gauss(oy, 0.1, 0.03) * 0.025;
        // Brow: Defined ridge
        if (oy > 0.06 && oy < 0.12 && Math.abs(ox) < 0.14 && oz > 0.08) v.z += gauss(oy, 0.09, 0.02) * 0.02;
        // Cheekbones: Lateral bulge
        if (oy > -0.05 && oy < 0.05 && oz > 0 && Math.abs(ox) > 0.14) v.x += Math.sign(ox) * gauss(oy, 0, 0.04) * gauss(Math.abs(ox), 0.18, 0.05) * 0.018;
        // Mouth: Deeper slit
        if (oz > 0.16 && Math.abs(ox) < 0.07 && oy > -0.22 && oy < -0.16) v.z -= gauss(oy, -0.19, 0.012) * gauss(ox, 0, 0.06) * 0.025;
        // Chin: Forward jut
        if (oy < -0.24 && oy > -0.36 && oz > 0.06 && Math.abs(ox) < 0.09) v.z += gauss(oy, -0.3, 0.04) * gauss(ox, 0, 0.06) * 0.025;
        // Temples: Deeper depression
        if (Math.abs(ox) > 0.22 && oy > -0.04 && oy < 0.14 && oz > -0.05) v.x -= Math.sign(ox) * gauss(Math.abs(ox), 0.28, 0.04) * gauss(oy, 0.05, 0.05) * 0.012;
        // Ears: Subtle caps
        if (Math.abs(ox) > 0.29 && oy > -0.06 && oy < 0.1) {
          const earStrength = gauss(oy, 0.01, 0.04) * gauss(Math.abs(ox), 0.34, 0.03);
          v.x += Math.sign(ox) * earStrength * 0.01;
          v.z += earStrength * 0.006;
        }
        // Back: Flatter curve
        if (oz < -0.12) v.z *= 1.0 + ss(-0.12, -0.28, oz) * 0.06;
      });
      const shell = new THREE.Mesh(baseGeo, faceMat.clone({ transmission: 0.04, thickness: 6 })); // Enhanced translucency
      this.add(shell);

      // Under-skull: Darker, offset back
      const skullGeo = baseGeo.clone();
      sculptGeo(skullGeo, v => { v.multiplyScalar(0.95); v.z -= 0.015; });
      this.add(new THREE.Mesh(skullGeo, darkMetal));

      // Seams: Use LineSegments for precision
      const vSeamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.15, 0.34), new THREE.Vector3(0, -0.35, 0.22)]);
      this.add(new THREE.Line(vSeamGeo, new THREE.LineBasicMaterial({ color: 0x888888 })));
      const hSeam = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.0015, 6, 36, Math.PI * 0.82), jointMat);
      hSeam.rotation.set(Math.PI/2 + 0.12, 0, Math.PI * 0.6);
      hSeam.position.set(0, 0.14, 0.05);
      this.add(hSeam);
      // Lower seam clone...

      // Eyes: Modular with lens
      this.eyes = [makeEye(-0.11, eyeCoreMat.clone()), makeEye(0.11, eyeCoreMat.clone())];
      this.eyePivot = new THREE.Group();
      this.eyes.forEach(eye => this.eyePivot.add(eye.group));
      this.add(this.eyePivot);
    }
  }
  // Instantiate: const head = new HeadModule(); head.position.y = 0.58; robot.add(head);