import { Engine, Scene, ArcRotateCamera, HemisphericLight, ... } from 'reactylon';
import { useBeforeRender, useEffect } from 'reactylon/hooks';

function SonnyBust() {
  const [tension, setTension] = useState(0.12);

  return (
    <Engine antialias>
      <Scene clearColor={new Color4(0.04, 0.05, 0.08, 1)}>
        <ArcRotateCamera name="cam" target={Vector3.Zero()} radius={8} ... />
        <HemisphericLight ... />

        {/* Metallic pivot base */}
        <Cylinder name="base" diameter={1} height={3.1} positionY={-1.55} material={metalMat} />

        {/* Robot group with auto rotation */}
        <TransformNode name="robot" rotationY={Math.sin(Date.now()/600)*1.72}>

          {/* HEAD – NodeMaterial SDF raymarcher (visual in NME or code) */}
          <Mesh name="head" positionY={0.68} scaling={new Vector3(0.93,0.86,0.93)}>
            <NodeMaterial 
              name="headSDF" 
              // Paste the full NME-exported SDF node graph here (twist, fBm, onion faceplate, eyelid blink, etc.)
              // Tension uniform drives twist amount + fBm intensity + blink height
            />
          </Mesh>

          {/* TORSO – another NodeMaterial SDF with bend + repeat spine channel */}
          <Mesh name="torso" positionY={-0.42} scaling={new Vector3(1.05,1,1.05)}>
            <NodeMaterial name="torsoSDF" /* full advanced graph */ />
          </Mesh>

          {/* NECK – Mesh from marching-cubes geometry (or procedural cylinder with repeat) */}
          <Mesh name="neck" fromBabylonGeometry={marchingCubesGeo} ... />

          {/* ARMS + HANDS – declarative with useBeforeRender for tension clench */}
          <Mesh name="leftArm" ... >
            {/* 8 cables as Tube meshes with fBm radius via custom material */}
            {Array.from({length:8}, (_,i) => (
              <Tube path={cableCurve(i)} radius={0.0178 + fBmNoise(i)*0.002} material={cableMat} />
            ))}
          </Mesh>

          {/* Stress particles – GPU particle system */}
          <ParticleSystem name="sparks" ... emitter={head} startSize={0.018} ... />

        </TransformNode>

        {/* Base rings, god rays (VolumetricLightScattering), DOF post-process, etc. */}
      </Scene>
    </Engine>
  );
}