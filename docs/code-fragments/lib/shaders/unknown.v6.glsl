vec3 calcNormal(vec3 p) {
    const float eps = 0.001;
    return normalize(vec3(
        map(p + vec3(eps,0,0)) - map(p - vec3(eps,0,0)),
        map(p + vec3(0,eps,0)) - map(p - vec3(0,eps,0)),
        map(p + vec3(0,0,eps)) - map(p - vec3(0,0,eps))
    ));
}
float ambientOcclusion(vec3 p, vec3 n) {
    float occ = 0.0;
    for(int i=1; i<=6; i++) {
        float d = 0.02 * float(i);
        occ += (d - map(p + n*d)) / pow(1.2,float(i));
    }
    return clamp(1.0 - 3.0*occ, 0.0, 1.0);
}
float softShadow(vec3 ro, vec3 rd, float mint, float tmax) {
    float res = 1.0;
    for(float t=mint; t<tmax; ) {
        float h = map(ro + rd*t);
        if(h<0.001) return 0.0;
        res = min(res, 8.0*h/t);
        t += clamp(h,0.01,0.2);
    }
    return res;
}