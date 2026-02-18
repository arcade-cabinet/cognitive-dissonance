const head = new Raymarcher('head');
head.position.y = 0.62;
head.scale.set(0.87,0.81,0.87);
robot.add(head);

// Seams (thin geometry on top)
const browSeam = new THREE.Mesh(new THREE.TorusGeometry(0.295,0.0018,6,48,Math.PI*0.83), jointMat);
browSeam.rotation.set(Math.PI*0.52,0,Math.PI*0.61);
browSeam.position.set(0,0.135,0.06);
head.add(browSeam);