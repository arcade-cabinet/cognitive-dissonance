const robot = new THREE.Group();

// Add modules in order
robot.add( new HeadSDF() );
robot.add( new NeckMarchingCubes() );
robot.add( new TorsoSDF() );
robot.add( new SpineMarchingCubes() ); // visible back only
robot.add( new LeftArmCableBundle() );
robot.add( new RightArmCableBundle() );
robot.add( new LeftLegCableBundle() );
robot.add( new RightLegCableBundle() );

// Single animation loop
function update(tension) {
    head.rotation.x = tension * 0.25;
    torso.scale.y = 1 + Math.sin(t * 2) * tension * 0.008;
    // propagate tension to every cable radius + curvature
}