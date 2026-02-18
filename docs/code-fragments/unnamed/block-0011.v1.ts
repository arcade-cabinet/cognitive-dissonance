// Minimal Marching Cubes kernel (full 300-line version available on GitHub, but here's the core loop)
function generateMarchingCubes(sdfFn, bounds, resolution = 48) {
  // ... standard MC implementation returning BufferGeometry
  // Each voxel: evaluate sdfFn at 8 corners, interpolate, build triangles
}

// Neck meta-balls
const neckSDF = (p) => {
  let d = Infinity;
  for(let i=0;i<7;i++) {
    const y = -0.14 + i*0.095;
    d = sdf.smoothUnion(d, sdf.sphere(p.clone().sub(new THREE.Vector3(0,y,-0.04)), 0.065 - i*0.008), 0.04);
  }
  return d;
};

const neckGeo = generateMarchingCubes(neckSDF, new THREE.Box3(new THREE.Vector3(-0.1,-0.3,-0.1), new THREE.Vector3(0.1,0.2,0.1)));
const neckMesh = new THREE.Mesh(neckGeo, darkMat);
neckMesh.position.y = 0.135;
robot.add(neckMesh);