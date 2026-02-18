float chamfer(float a, float b, float r) {
    float m = min(a,b);
    float n = max(a,b) - r;
    return min(m, n);
}
float roundUnion(float a, float b, float r) {
    vec2 u = max(vec2(r - a, r - b), 0.0);
    return max(r, min(a,b)) - length(u);
}
float onion(float d, float thickness) { return abs(d) - thickness; }
float extrude(float d2D, float h) {
    vec2 w = vec2(d2D, abs(h) - 0.5);
    return min(max(w.x,w.y),0.0) + length(max(w,0.0));
}