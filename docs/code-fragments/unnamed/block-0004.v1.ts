class ArmModule extends THREE.Group {
    constructor(isLeft) {
      super();
      const s = isLeft ? -1 : 1;
      this.position.set(s*0.54, -0.18, 0);
      // Cap: Helmet-like over joint
      const capGeo = new THREE.SphereGeometry(0.13, 18, 18);
      sculptGeo(capGeo, v => { if (v.y < -0.03) v.y *= 0.35; v.z *= 0.75; });
      this.add(new THREE.Mesh(capGeo, shellMat));
      // Joint ball/ring...
      // Upper cables: 8 with noise
      const hexOff = [/* 8 offsets with random */];
      hexOff.forEach(off => {
        const pathPoints = [/* 4-5 points with Perlin noise offsets */];
        const path = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.35);
        this.add(new THREE.Mesh(new THREE.TubeGeometry(path, 20, 0.018, 7), cableMat));
      });
      // Rings, elbow with pistons (3 circumferential cylinders)...
      // Forearm pivot with IK: Use THREE.IKChain or custom quaternion...
      // Hands: Palm as softened box, fingers as chained cylinders with joints...
    }
  }
  // Instantiate left/right...