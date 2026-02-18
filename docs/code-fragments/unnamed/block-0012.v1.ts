const torsoSDF = (p) => {
  let w = 0.52, d = 0.162;
  if(p.y > 0.68) w = lerp(0.055,0.12,ss(0.68,0.82,p.y));
  else if(p.y > 0.48) w = lerp(0.12,0.48,ss(0.48,0.68,p.y));
  else if(p.y > -0.22) w = 0.51;
  else if(p.y > -0.55) w = lerp(0.48,0.51,ss(-0.55,-0.22,p.y));
  else w = lerp(0.39,0.48,ss(-0.85,-0.55,p.y));
  
  const q = new THREE.Vector3(p.x/w, p.y, p.z/d);
  let shell = sdf.sphere(q, 1.0);
  
  // Back spine channel
  shell = sdf.subtract(shell, sdf.box(p.clone().sub(new THREE.Vector3(0,-0.32,-0.07)), new THREE.Vector3(0.21,0.75,0.04)));
  
  // Pec grooves
  shell = sdf.smoothUnion(shell, sdf.box(p.clone().sub(new THREE.Vector3(0,0.12,0.09)), new THREE.Vector3(0.04,0.18,0.01)), 0.03);
  
  return shell * 0.62;
};

const torso = new Raymarcher('torso'); // reuse class with torsoSDF injected
torso.position.y = -0.52;
robot.add(torso);

// Central glowing core (visible through transmission)
const core = new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.038,0.42,16), eyeCoreMat);
core.rotation.x = Math.PI/2;
core.position.set(0,-0.28,0.142);
torso.add(core);