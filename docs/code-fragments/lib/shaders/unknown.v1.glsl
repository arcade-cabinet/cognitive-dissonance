// In fragment shader (RaymarcherMaterial)
float headSDF(vec3 p) {
    p.y *= 1.12;                     // taller oval
    float shell = sdSphere(p, 0.245);
    
    // Face plate flatten
    vec3 fp = p; fp.z -= 0.09;
    float faceCut = sdBox(fp, vec3(0.24, 0.32, 0.01));
    shell = opSmoothSubtraction(faceCut, shell, 0.06);
    
    // Eye sockets (two subtracts)
    shell = opSmoothSubtraction(sdSphere(p - vec3(-0.108,0.038,0.265), 0.092), shell, 0.04);
    shell = opSmoothSubtraction(sdSphere(p - vec3( 0.108,0.038,0.265), 0.092), shell, 0.04);
    
    // Brow ridge, chin, etc. via additional primitives
    return shell;
}