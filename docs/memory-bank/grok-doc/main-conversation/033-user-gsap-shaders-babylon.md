# Turn 33 (USER) — Lines 4374-4543

**Summary**: I want to adapt this shader to the gameboard background. How would that work in Reactylon? You are given a task to integrate an existing React compone
**Topics**: gsap, shaders, babylon, sonny, controls
**Code**: 2 | **New**: YES | **Design**: no | **Definitive**: no

---

I want to adapt this shader to the gameboard background. How would that work in Reactylon? You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
atc-shader.tsx
// ShaderDemo_ATC.tsx  (for your “ATC” one-liner)
"use client"

import { useEffect, useRef } from "react"

const vertSrc = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos,0.0,1.0); }`

const fragSrc = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2  u_res;
uniform float u_time;

// robust tanh fallback
float tanh1(float x){ float e = exp(2.0*x); return (e-1.0)/(e+1.0); }
vec4 tanh4(vec4 v){ return vec4(tanh1(v.x), tanh1(v.y), tanh1(v.z), tanh1(v.w)); }

void main(){
  vec3 FC = vec3(gl_FragCoord.xy, 0.0);
  vec3 r  = vec3(u_res, max(u_res.x, u_res.y));
  float t = u_time;

  vec4 o = vec4(0.0);

  // === your code with safe inits & valid mat2 multiply, tanh replacement ===
  vec3 p = vec3(0.0);
  vec3 v = vec3(1.0, 2.0, 6.0);
  float i = 0.0, z = 1.0, d = 1.0, f = 1.0;

  for ( ; i++ < 5e1;
        o.rgb += (cos((p.x + z + v) * 0.1) + 1.0) / d / f / z )
  {
    p = z * normalize(FC * 2.0 - r.xyy);

    vec4 m = cos((p + sin(p)).y * 0.4 + vec4(0.0, 33.0, 11.0, 0.0));
    p.xz = mat2(m) * p.xz;

    p.x += t / 0.2;

    z += ( d = length(cos(p / v) * v + v.zxx / 7.0) /
           ( f = 2.0 + d / exp(p.y * 0.2) ) );
  }

  o = tanh4(0.2 * o);
  o.a = 1.0;
  fragColor = o;
}`

export default function ShaderDemo_ATC(){
  const ref = useRef<HTMLCanvasElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    const canvas = ref.current!, pre = preRef.current!
    const gl = canvas.getContext("webgl2", { premultipliedAlpha:false })
    if (!gl) { pre.textContent = "WebGL2 not available"; return }

    const compile = (type:number, src:string) => {
      const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(sh) || "compile error")
      return sh
    }
    const link = (vs:string, fs:string) => {
      const p = gl.createProgram()!
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs))
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p) || "link error")
      return p
    }

    let prog: WebGLProgram
    try { prog = link(vertSrc, fragSrc) }
    catch(e:any){ (pre.textContent as any) = "Shader error:
"+e.message; return }

    gl.useProgram(prog)

    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,  1,-1, -1, 1,  -1, 1,  1,-1,  1, 1,
    ]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0)

    const uRes  = gl.getUniformLocation(prog, "u_res")
    const uTime = gl.getUniformLocation(prog, "u_time")

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1))
      const w = Math.floor((canvas.clientWidth||window.innerWidth)*dpr)
      const h = Math.floor((canvas.clientHeight||window.innerHeight)*dpr)
      if (canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h }
      gl.viewport(0,0,w,h)
      gl.uniform2f(uRes, w, h)
    }
    const onResize = () => { resize() }
    window.addEventListener("resize", onResize, {passive:true})
    resize()

    let raf = 0
    const t0 = performance.now()
    const draw = () => {
      const t = (performance.now()-t0)/1000
      gl.uniform1f(uTime, t)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize) }
  }, [])

  return (
    <div style={{position:"relative"}}>
      <canvas ref={ref} style={{ width:"100%", height:"100vh", display:"block", background:"#000" }} />
      <pre ref={preRef} style={{position:"absolute",top:8,left:8,color:"#0f0",whiteSpace:"pre-wrap"}}/>
    </div>
  )
}


demo.tsx
// demo-atc.tsx
"use client"
import ShaderDemo_ATC from "@/components/ui/atc-shader"
export default function Demo(){ return <ShaderDemo_ATC/> }

```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them