const robot = new THREE.Group();
robot.add(head, neckMesh, torso, spineMesh, leftArm, rightArm, leftLeg, rightLeg);
scene.add(robot);

function animate() {
  const t = clock.getElapsedTime();
  const tension = parseFloat(slider.value)/100;
  
  // Global tension propagation
  head.material.uniforms.tension.value = tension;
  torso.material.uniforms.tension.value = tension;
  
  // Breathing + stress wobble
  torso.scale.y = 1 + Math.sin(t*1.8 + tension)*tension*0.009;
  
  // Eye glow color shift
  const col = new THREE.Color().lerpColors(new THREE.Color(0x88bbff), new THREE.Color(0xff3366), tension);
  eyeLight.color.copy(col);
  
  controls.update();
  renderer.render(scene, camera);
}