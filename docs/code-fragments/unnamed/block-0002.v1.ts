class NeckModule extends THREE.Group {
    constructor() {
      super();
      this.position.y = 0.11;
      // Core cylinder
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.42, 12), darkMetal));
      // Rings: Instanced for efficiency
      const ringGeo = new THREE.TorusGeometry(1, 0.009, 10, 16);
      const ringInst = new THREE.InstancedMesh(ringGeo, boneMat, 5);
      for (let i = 0; i < 5; i++) {
        const matrix = new THREE.Matrix4().makeRotationX(Math.PI/2).setPosition(0, -0.14 + i*0.095, 0).scale(new THREE.Vector3(0.11 - i*0.01, 1, 0.11 - i*0.01));
        ringInst.setMatrixAt(i, matrix);
      }
      this.add(ringInst);
      // Cables: Irregular CatmullRom
      const offsets = [{x:-0.07,z:0.04}, {x:0.07,z:0.04}, {x:-0.06,z:-0.05}, {x:0.06,z:-0.05}];
      offsets.forEach(off => {
        const path = new THREE.CatmullRomCurve3([new THREE.Vector3(off.x, 0.18, off.z), /* irregular points with random offsets */]);
        this.add(new THREE.Mesh(new THREE.TubeGeometry(path, 18, 0.007, 8), cableMat));
      });
      // Pistons: Vertical supports
      [-1,1].forEach(side => {
        const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8), jointMat);
        piston.position.set(side*0.09, 0, 0);
        this.add(piston);
      });
    }
  }
  // Instantiate: robot.add(new NeckModule());