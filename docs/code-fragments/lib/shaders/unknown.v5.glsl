vec3 twistDomain(vec3 p, float amount) {
    float c = cos(amount * p.y);
    float s = sin(amount * p.y);
    mat2 m = mat2(c,-s,s,c);
    return vec3(m * p.xz, p.y);
}
vec3 bendDomain(vec3 p, float amount) {
    float c = cos(amount * p.x);
    float s = sin(amount * p.x);
    return vec3(p.x, m * p.yz);
}