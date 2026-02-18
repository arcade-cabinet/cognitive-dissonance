import * as BABYLON from '@babylonjs/core';

const VERTEX_SHADER = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() {
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUV;
uniform float u_time;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_cloud_density;
uniform float u_glow_intensity;

float random(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898,78.233,151.7182))) * 43758.5453);
}
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f*f*(3.0 - 2.0*f);
    return mix(
        mix(mix(random(i+vec3(0,0,0)), random(i+vec3(1,0,0)), u.x),
            mix(random(i+vec3(0,1,0)), random(i+vec3(1,1,0)), u.x), u.y),
        mix(mix(random(i+vec3(0,0,1)), random(i+vec3(1,0,1)), u.x),
            mix(random(i+vec3(0,1,1)), random(i+vec3(1,1,1)), u.x), u.y),
        u.z
    );
}
float fbm(vec3 p) {
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 6; i++) {
        v += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return v;
}
void main() {
    vec2 uv = vUV * 2.0 - 1.0;
    float d = 1.0 - dot(uv, uv);
    if (d < 0.0) discard;
    vec3 pos = vec3(uv, sqrt(d));
    vec3 coord = pos * u_cloud_density + u_time * 0.1;
    float c = fbm(coord);
    vec3 nebula = mix(u_color1, u_color2, smoothstep(0.4, 0.6, c));
    float fresnel = pow(1.0 - max(dot(normalize(pos), vec3(0,0,1)), 0.0), 2.0) * u_glow_intensity;
    vec3 glow = fresnel * u_color2;
    gl_FragColor = vec4(nebula + glow, 1.0);
}
`;

export function createCelestialShaderMaterial(scene: BABYLON.Scene): BABYLON.ShaderMaterial {
  BABYLON.Effect.ShadersStore["celestialVertexShader"] = VERTEX_SHADER;
  BABYLON.Effect.ShadersStore["celestialFragmentShader"] = FRAGMENT_SHADER;

  const material = new BABYLON.ShaderMaterial(
    "celestialNebula",
    scene,
    {
      vertex: "celestial",
      fragment: "celestial",
    },
    {
      attributes: ["position", "uv"],
      uniforms: ["worldViewProjection", "u_time", "u_color1", "u_color2", "u_cloud_density", "u_glow_intensity"],
    }
  );

  material.setFloat("u_cloud_density", 4.5);
  material.setFloat("u_glow_intensity", 1.2);
  material.setColor3("u_color1", BABYLON.Color3.FromHexString("#4400ff"));
  material.setColor3("u_color2", BABYLON.Color3.FromHexString("#00ffff"));
  material.backFaceCulling = false;
  material.alpha = 1.0;

  return material;
}

// Reactylon usage example (inner sphere)
export function CelestialNebulaSphere() {
  const sphereRef = React.useRef<BABYLON.Mesh>(null!);
  const scene = useScene();
  const materialRef = React.useRef<BABYLON.ShaderMaterial | null>(null);

  React.useEffect(() => {
    if (!sphereRef.current) return;
    const mat = createCelestialShaderMaterial(scene);
    materialRef.current = mat;
    sphereRef.current.material = mat;
    return () => mat.dispose();
  }, [scene]);

  React.useEffect(() => {
    if (!materialRef.current) return;
    const mat = materialRef.current;
    const observer = scene.registerBeforeRender(() => {
      mat.setFloat("u_time", performance.now() / 1000);
    });
    return () => scene.unregisterBeforeRender(observer);
  }, [scene]);

  return (
    <sphere
      ref={sphereRef}
      name="celestialSphere"
      options={{ diameter: 2.8, segments: 64 }}
      position={[0, 0, 0]}
    />
  );
}