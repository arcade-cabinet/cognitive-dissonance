vec3 repeatDomain(vec3 p, vec3 spacing) {
    return p - spacing * round(p / spacing);
}
vec3 mirrorDomain(vec3 p, vec3 mirrorPlane) {
    return abs(p) - mirrorPlane;
}
// Polar repetition for circular neck rings
vec2 polarRepeat(vec2 p, float count) {
    float a = atan(p.y,p.x);
    float r = length(p);
    a = mod(a, 6.28318/count) - 3.14159/count;
    return vec2(cos(a),sin(a)) * r;
}