float hash(vec3 p) { p = fract(p*0.3183099 + .1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fBm(vec3 p, int octaves) {
    float v = 0.0; float a = 0.5;
    for(int i=0; i<octaves; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
}
// Displacement
float displacedSDF(vec3 p, float base) {
    return base + fBm(p*12.0, 5) * 0.008 * (1.0 - tension); // less noise when stressed
}