class Raymarcher extends THREE.Mesh {
  constructor(sdfFnName, materialParams = {}) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        tension: { value: 0 },
        camPos: { value: new THREE.Vector3() }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() { vWorldPos = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: `
        uniform float time; uniform float tension; uniform vec3 camPos;
        varying vec3 vWorldPos;
        float sdSphere(vec3 p, float r) { return length(p)-r; }
        float sdBox(vec3 p, vec3 b) { return length(max(abs(p)-b,0.0)); }
        float opSmoothSub(vec3 p, float a, float b, float k) {
          float h = clamp(0.5-0.5*(b-a)/k,0.0,1.0);
          return mix(b,a,h) - k*h*(1.0-h);
        }
        
        // === YOUR SDF HERE (replace per body part) ===
        float map(vec3 p) {
          // Example: head
          p.y *= 1.12;
          float shell = sdSphere(p, 0.245);
          // face flatten
          shell = opSmoothSub(p, shell, sdBox(p-vec3(0,0,0.09), vec3(0.24,0.32,0.05)), 0.06);
          // eyes
          shell = opSmoothSub(p, shell, sdSphere(p-vec3(-0.108,0.038,0.265),0.092), 0.04);
          shell = opSmoothSub(p, shell, sdSphere(p-vec3( 0.108,0.038,0.265),0.092), 0.04);
          return shell;
        }
        
        void main() {
          vec3 ro = camPos;
          vec3 rd = normalize(vWorldPos - ro);
          float t = 0.0;
          for(int i=0;i<120;i++) {
            vec3 p = ro + rd * t;
            float d = map(p);
            if(d<0.001) { gl_FragColor = vec4(0.94,0.95,0.97,1.0); break; }
            t += d * 0.85;
            if(t>20.0) discard;
          }
        }
      `,
      ...materialParams
    });
    const geo = new THREE.PlaneGeometry(2,2);
    super(geo, mat);
  }
}