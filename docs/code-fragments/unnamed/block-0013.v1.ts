function createArm(isLeft) {
  const s = isLeft ? -1 : 1;
  const arm = new THREE.Group();
  arm.position.set(s*0.535, -0.14, 0.02);
  
  // SDF shoulder cap
  const cap = new Raymarcher('shoulderCap'); // tiny SDF sphere flattened
  arm.add(cap);
  
  // 8 upper cables with noise
  for(let i=0;i<8;i++) {
    const ang = i*Math.PI*2/8 + (i%3)*0.3;
    const off = new THREE.Vector3(Math.cos(ang)*0.032, 0, Math.sin(ang)*0.032);
    const curve = new THREE.CatmullRomCurve3([
      off.clone(),
      off.clone().multiplyScalar(1.12).add(new THREE.Vector3(0,-0.22,0)).add(new THREE.Vector3(Math.random()*0.01-0.005,0,Math.random()*0.01-0.005)),
      // ... two more noisy points
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve,28,0.0175,7,false), cableMat);
    arm.add(tube);
  }
  
  // Elbow ball + pistons (instanced cylinders rotated around axis)
  // Forearm pivot Group with tension-driven rotation
  // Hand = sculpted box + 5 finger chains (each finger = 2 cylinders + knuckle sphere)
  
  return arm;
}