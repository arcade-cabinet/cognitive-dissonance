# Turn 129 (USER) — Lines 19400-20026

**Summary**: I have the updated variant 4:
**Topics**: glass-sphere, platter, gsap, shaders, babylon, tension, seed, controls, r21dev, csp
**Code**: 0 | **New**: no | **Design**: no | **Definitive**: no

---

I have the updated variant 4:
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
interface CelestialSphereShaderProps {
  hue?: number;
  speed?: number;
  zoom?: number;
  particleSize?: number;
  className?: string;
  tension?: number;
}
const CelestialSphereShader: React.FC<CelestialSphereShaderProps> = ({
  hue = 200.0,
  speed = 0.3,
  zoom = 1.5,
  particleSize = 3.0,
  className = "",
  tension = 0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;
    let scene: THREE.Scene,
      camera: THREE.OrthographicCamera,
      renderer: THREE.WebGLRenderer,
      material: THREE.ShaderMaterial,
      mesh: THREE.Mesh;
    let animationFrameId: number;
    const mouse = new THREE.Vector2(0.5, 0.5);
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const fragmentShader = `
      precision highp float;
      varying vec2 vUv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_hue;
      uniform float u_zoom;
      uniform float u_particle_size;
      uniform float u_tension;
      vec3 hsl2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
        return c.z * mix(vec3(1.0), rgb, c.y);
      }
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
      }
      float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 6; i++) {
          value += amplitude * noise(st);
          st *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        uv *= u_zoom;
        vec2 mouse_normalized = u_mouse / u_resolution;
        uv += (mouse_normalized - 0.5) * 0.8;
        float f = fbm(uv + vec2(u_time * 0.1, u_time * 0.05));
        float t = fbm(uv + f + vec2(u_time * 0.05, u_time * 0.02));
       
        float nebula = pow(t, 2.0);
        float hueShift = mix(210.0, 0.0, u_tension);
        vec3 color = hsl2rgb(vec3(hueShift / 360.0 + nebula * 0.2, 0.7 + u_tension * 0.2, 0.5 + u_tension * 0.3));
        color *= nebula * (2.5 + u_tension * 1.5);
        float star_val = random(vUv * 500.0);
        if (star_val > 0.998) {
            float star_brightness = (star_val - 0.998) / 0.002;
            color += vec3(star_brightness * u_particle_size);
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const init = () => {
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      currentMount.appendChild(renderer.domElement);
      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          u_time: { value: 0.0 },
          u_resolution: { value: new THREE.Vector2() },
          u_mouse: { value: new THREE.Vector2() },
          u_hue: { value: hue },
          u_zoom: { value: zoom },
          u_particle_size: { value: particleSize },
          u_tension: { value: tension },
        },
      });
      const geometry = new THREE.PlaneGeometry(2, 2);
      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      addEventListeners();
      resize();
      animate();
    };
    const animate = () => {
      material.uniforms.u_time.value += 0.005 * speed;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    const resize = () => {
      const { clientWidth, clientHeight } = currentMount;
      renderer.setSize(clientWidth, clientHeight);
      material.uniforms.u_resolution.value.set(clientWidth, clientHeight);
      camera.updateProjectionMatrix();
    };
    const onMouseMove = (event: MouseEvent) => {
      const rect = currentMount.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      material.uniforms.u_mouse.value.set(mouse.x, currentMount.clientHeight - mouse.y);
    };
    const addEventListeners = () => {
      window.addEventListener("resize", resize);
      window.addEventListener("mousemove", onMouseMove);
    };
    const removeEventListeners = () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
    init();
    return () => {
      material.uniforms.u_tension.value = tension;
      removeEventListeners();
      cancelAnimationFrame(animationFrameId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [hue, speed, zoom, particleSize, tension]);
  return <div ref={mountRef} className={className || "w-full h-full"} />;
};
interface MechanicalKeyProps {
  position: [number, number, number];
  visible: boolean;
}
const MechanicalKey: React.FC<MechanicalKeyProps> = ({ position, visible }) => {
  const keyRef = useRef<THREE.Group>(null);
  const [pressed, setPressed] = useState(false);
  useFrame(() => {
    if (keyRef.current && visible) {
      const targetY = pressed ? position[1] - 0.05 : position[1];
      keyRef.current.position.y += (targetY - keyRef.current.position.y) * 0.15;
    }
  });
  if (!visible) return null;
  return (
    <group ref={keyRef} position={position}>
      {/* Keycap */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.15, 0.08, 0.15]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.3}
          emissive="#00ccff"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Play symbol */}
      <mesh position={[0, 0.041, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.03, 0.05, 3]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#00ccff"
          emissiveIntensity={1.5}
        />
      </mesh>
      {/* Key stem */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.04, 16]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.4} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={0.8} color="#00ccff" distance={0.5} />
    </group>
  );
};
interface LeverSwitchProps {
  position: [number, number, number];
  visible: boolean;
}
const LeverSwitch: React.FC<LeverSwitchProps> = ({ position, visible }) => {
  const leverRef = useRef<THREE.Group>(null);
  const [toggled, setToggled] = useState(false);
  useFrame(() => {
    if (leverRef.current && visible) {
      const targetRotation = toggled ? -Math.PI / 4 : Math.PI / 4;
      leverRef.current.rotation.z += (targetRotation - leverRef.current.rotation.z) * 0.1;
    }
  });
  if (!visible) return null;
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 32]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.3}
        />
      </mesh>
      {/* Lever */}
      <group ref={leverRef} position={[0, 0.02, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.015, 0.02, 0.24, 16]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.85}
            roughness={0.35}
            emissive="#0088ff"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* Lever tip */}
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial
            color="#00ccff"
            metalness={0.9}
            roughness={0.2}
            emissive="#00ccff"
            emissiveIntensity={1.2}
          />
        </mesh>
      </group>
      <pointLight position={[0, 0, 0]} intensity={0.6} color="#0088ff" distance={0.5} />
    </group>
  );
};
interface GarageDoorProps {
  position: [number, number, number];
  rotation: [number, number, number];
  open: boolean;
}
const GarageDoor: React.FC<GarageDoorProps> = ({ position, rotation, open }) => {
  const topDoorRef = useRef<THREE.Mesh>(null);
  const bottomDoorRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (topDoorRef.current && bottomDoorRef.current) {
      const targetTopY = open ? 0.12 : 0;
      const targetBottomY = open ? -0.12 : 0;
      topDoorRef.current.position.y += (targetTopY - topDoorRef.current.position.y) * 0.08;
      bottomDoorRef.current.position.y += (targetBottomY - bottomDoorRef.current.position.y) * 0.08;
    }
  });
  return (
    <group position={position} rotation={rotation}>
      {/* Top door panel */}
      <mesh ref={topDoorRef} position={[0, 0, 0]}>
        <boxGeometry args={[0.25, 0.12, 0.18]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.95}
          roughness={0.25}
          emissive="#0044aa"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Bottom door panel */}
      <mesh ref={bottomDoorRef} position={[0, 0, 0]}>
        <boxGeometry args={[0.25, 0.12, 0.18]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.95}
          roughness={0.25}
          emissive="#0044aa"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Recess glow */}
      <pointLight position={[0, 0, -0.05]} intensity={0.5} color="#00aaff" distance={0.4} />
    </group>
  );
};
interface IndustrialPlatterProps {
  setTension: (tension: number) => void;
}
const IndustrialPlatterWithTension: React.FC<IndustrialPlatterProps> = ({ setTension }) => {
  const platterRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const [keyDoorOpen, setKeyDoorOpen] = useState(false);
  const [leverDoorOpen, setLeverDoorOpen] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [leverVisible, setLeverVisible] = useState(false);
  const [localTension, setLocalTension] = useState(0);
  // Simulate tension increase for demo
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const newTension = Math.sin(time * 0.2) * 0.5 + 0.5; // 0 to 1
    setLocalTension(newTension);
    setTension(newTension);
  });
  useFrame((state) => {
    if (platterRef.current) {
      // Only rotate around Y axis - platter stays flat
      platterRef.current.rotation.y += 0.002;
      platterRef.current.rotation.x = 0;
      platterRef.current.rotation.z = 0;
      platterRef.current.position.y = 0; // Keep at ground level
    }
    if (sphereRef.current) {
      const time = state.clock.getElapsedTime();
      sphereRef.current.rotation.y = time * 0.3;
      // Add jitter based on tension
      const jitter = localTension * 0.02;
      sphereRef.current.rotation.x = Math.sin(time * 2) * jitter;
      sphereRef.current.rotation.z = Math.cos(time * 2.3) * jitter;
    }
    // Update shader material tension uniform
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.u_time.value = state.clock.getElapsedTime();
      shaderMaterialRef.current.uniforms.u_tension.value = localTension;
    }
    // Auto-open doors after 3 seconds for demo
    const time = state.clock.getElapsedTime();
    if (time > 3 && !keyDoorOpen) {
      setKeyDoorOpen(true);
      setTimeout(() => setKeyVisible(true), 800);
    }
    if (time > 4 && !leverDoorOpen) {
      setLeverDoorOpen(true);
      setTimeout(() => setLeverVisible(true), 800);
    }
  });
  // Platter with thick rim - 18cm = 0.18m minimum
  const platterGeometry = new THREE.CylinderGeometry(3, 3, 0.3, 64);
  const rimGeometry = new THREE.TorusGeometry(3, 0.2, 32, 64); // Thicker rim
  const trackGeometry = new THREE.TorusGeometry(0.52, 0.06, 32, 64);
  const sphereGeometry = new THREE.SphereGeometry(0.52, 64, 64);
  // Shader material for sphere interior
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    precision highp float;
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float u_time;
    uniform float u_tension;
    vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }
    float random(vec3 st) {
      return fract(sin(dot(st.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453123);
    }
    float noise(vec3 st) {
      vec3 i = floor(st);
      vec3 f = fract(st);
      float a = random(i);
      float b = random(i + vec3(1.0, 0.0, 0.0));
      float c = random(i + vec3(0.0, 1.0, 0.0));
      float d = random(i + vec3(1.0, 1.0, 0.0));
      vec3 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec3 st) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    void main() {
      vec3 pos = vPosition;
     
      // Add jitter based on tension
      pos += vec3(
        sin(u_time * 10.0 + pos.x * 20.0) * u_tension * 0.1,
        cos(u_time * 12.0 + pos.y * 20.0) * u_tension * 0.1,
        sin(u_time * 11.0 + pos.z * 20.0) * u_tension * 0.1
      );
      float f = fbm(pos * 2.0 + vec3(u_time * 0.2, u_time * 0.15, u_time * 0.1));
      float t = fbm(pos * 3.0 + f + vec3(u_time * 0.1, u_time * 0.08, u_time * 0.05));
     
      float nebula = pow(t, 2.0);
     
      // Color transition: blue -> yellow/green -> red based on tension
      float hue = mix(210.0, 0.0, u_tension); // Blue to Red
      float saturation = 0.7 + u_tension * 0.2;
      float lightness = 0.4 + nebula * 0.3 + u_tension * 0.2;
     
      vec3 color = hsl2rgb(vec3(hue / 360.0 + nebula * 0.15, saturation, lightness));
      color *= (2.0 + u_tension * 2.0) * nebula;
     
      // Add corruption/static at high tension
      if (u_tension > 0.5) {
        float staticNoise = random(pos + vec3(u_time * 50.0));
        if (staticNoise > 0.85) {
          color = mix(color, vec3(1.0, 0.0, 0.0), (u_tension - 0.5) * 2.0);
        }
      }
      gl_FragColor = vec4(color, 0.9);
    }
  `;
  return (
    <group ref={platterRef} position={[0, 0, 0]}>
      {/* Main platter surface */}
      <mesh geometry={platterGeometry} position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.92}
          roughness={0.28}
          envMapIntensity={1.5}
        />
      </mesh>
      {/* Machined surface details */}
      <mesh position={[0, 0.151, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[2.95, 2.95, 0.002, 128]} />
        <meshStandardMaterial
          color="#151515"
          metalness={0.88}
          roughness={0.35}
        />
      </mesh>
      {/* Thick outer rim with RGB lighting */}
      <mesh geometry={rimGeometry} position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.96}
          roughness={0.18}
          emissive="#0088ff"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Inner rim detail */}
      <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.8, 0.05, 24, 64]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>
      {/* Recessed center track for sphere */}
      <mesh geometry={trackGeometry} position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.82}
          roughness={0.38}
        />
      </mesh>
      {/* Track inner shadow */}
      <mesh position={[0, 0.155, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.52, 0.03, 24, 64]} />
        <meshStandardMaterial
          color="#050505"
          metalness={0.7}
          roughness={0.6}
        />
      </mesh>
      {/* Glass sphere container */}
      <mesh ref={sphereRef} geometry={sphereGeometry} position={[0, 0.68, 0]}>
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0.05}
          roughness={0.02}
          transmission={0.98}
          thickness={0.8}
          ior={1.52}
          transparent={true}
          opacity={0.95}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </mesh>
      {/* Nebula shader effect inside sphere */}
      <mesh position={[0, 0.68, 0]}>
        <sphereGeometry args={[0.50, 64, 64]} />
        <shaderMaterial
          ref={shaderMaterialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{
            u_time: { value: 0 },
            u_tension: { value: tension },
          }}
          transparent={true}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Garage doors for key and lever */}
      <GarageDoor
        position={[0, 0.15, 2.85]}
        rotation={[0, 0, 0]}
        open={keyDoorOpen}
      />
      <GarageDoor
        position={[-2.85, 0.15, 0]}
        rotation={[0, Math.PI / 2, 0]}
        open={leverDoorOpen}
      />
      {/* Mechanical key */}
      <MechanicalKey
        position={[0, 0.3, 2.75]}
        visible={keyVisible}
      />
      {/* Lever switch */}
      <LeverSwitch
        position={[-2.75, 0.3, 0]}
        visible={leverVisible}
      />
      {/* Sphere internal lighting */}
      <pointLight position={[0, 0.68, 0]} intensity={0.8 + tension * 0.5} color={tension > 0.5 ? "#ff3300" : "#0088ff"} distance={2} />
     
      {/* Rim accent lights */}
      <pointLight position={[3, 0.15, 0]} intensity={0.4} color="#0088ff" distance={1.2} />
      <pointLight position={[-3, 0.15, 0]} intensity={0.4} color="#0088ff" distance={1.2} />
      <pointLight position={[0, 0.15, 3]} intensity={0.4} color="#0088ff" distance={1.2} />
      <pointLight position={[0, 0.15, -3]} intensity={0.4} color="#0088ff" distance={1.2} />
    </group>
  );
};
const BabylonPlatterScene: React.FC = () => {
  const [tension, setTension] = useState(0);
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div className="absolute inset-0 z-0">
        <CelestialSphereShader
          hue={210}
          speed={0.4}
          zoom={1.2}
          particleSize={4.0}
          tension={tension}
          className="absolute top-0 left-0 w-full h-full opacity-30"
        />
      </div>
      <Canvas
        camera={{ position: [5, 4, 5], fov: 45 }}
        className="absolute inset-0 z-10"
      >
        <color attach="background" args={["#000000"]} />
       
        <ambientLight intensity={0.15} />
        <directionalLight position={[10, 10, 5]} intensity={0.4} color="#ffffff" castShadow />
        <directionalLight position={[-5, 8, -5]} intensity={0.25} color="#0088ff" />
       
        <hemisphereLight args={["#003366", "#000000", 0.4]} />
       
        {/* Dramatic key light from above */}
        <spotLight
          position={[0, 8, 0]}
          intensity={0.6}
          angle={0.6}
          penumbra={0.5}
          color="#ffffff"
          castShadow
        />
       
        <IndustrialPlatterWithTension setTension={setTension} />
       
        <OrbitControls
          enableDamping={true}
          dampingFactor={0.06}
          minDistance={4}
          maxDistance={18}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 6}
          enablePan={false}
          autoRotate={false}
        />
       
        <fog attach="fog" args={["#000000", 8, 25]} />
      </Canvas>
      <div className="absolute bottom-8 left-8 z-20 text-white font-mono text-sm space-y-2">
        <div className="bg-black/60 backdrop-blur-sm px-4 py-3 rounded border border-blue-500/40">
          <p className="text-blue-400 font-semibold">Industrial Heavy Metal Platter</p>
          <p className="text-gray-400 text-xs mt-1">Babylon.js Compatible • CSP-Safe • PBR Materials</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Tension:</span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${tension * 100}%`,
                  backgroundColor: tension < 0.3 ? '#0088ff' : tension < 0.6 ? '#ffaa00' : '#ff3300'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BabylonPlatterScene;