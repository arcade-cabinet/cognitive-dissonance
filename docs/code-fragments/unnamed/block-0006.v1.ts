// 1. SDF version (for raymarched shell)
float torsoSDF(vec3 p) {
    float w = torsoWidth(p.y);   // your original torsoW function, now inside shader
    float d = torsoDepth(p.y);
    vec3 q = vec3(p.x / w, p.y, p.z / d);
    float shell = sdSphere(q, 1.0);           // base egg
    // back spine channel subtract
    shell = opSubtraction(sdBox(p - vec3(0, -0.32, -0.07), vec3(0.21,0.75,0.04)), shell);
    return shell * 0.62; // scale back
}