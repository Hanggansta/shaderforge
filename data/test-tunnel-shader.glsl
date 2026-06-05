precision mediump float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

#define STEPS 80
#define STEP_SIZE 0.08
#define SPEED 1.0
#define AMPLITUDE 0.8

float noise(vec3 p) {
    return sin(p.x) * sin(p.y) * sin(p.z);
}

float fbm(vec3 p) {
    float value = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for(int i = 0; i < 6; i++) {
        value += amp * noise(p * freq);
        amp *= 0.5;
        freq *= 2.0;
    }
    return value;
}

float sdTunnel(vec3 p) {
    return 1.0 - length(p.xz);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    
    // Camera
    vec3 ro = vec3(0.0, 0.0, iTime * SPEED);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    // Raymarch
    float glow = 0.0;
    vec3 pos = ro;
    
    for(int i = 0; i < STEPS; i++) {
        vec3 p = pos;
        
        // Domain warp
        vec3 warp = vec3(
            fbm(p + iTime * 0.3),
            fbm(p + iTime * 0.3 + 100.0),
            fbm(p + iTime * 0.3 + 200.0)
        );
        p.xy += warp.xy * AMPLITUDE;
        
        // Tunnel SDF
        float tunnel = sdTunnel(p);
        
        // Sample density inside tunnel
        float density = 0.0;
        if(tunnel > 0.0) {
            density = fbm(p * 1.5 + iTime * 0.2);
            density = max(0.0, density * 0.5 + 0.5);
            density *= tunnel * 2.0;
        }
        
        glow += density * STEP_SIZE;
        
        // Early termination
        if(glow > 1.0) break;
        
        pos += rd * STEP_SIZE;
    }
    
    // Tone mapping
    float col = glow / (1.0 + glow);
    col = 1.0 - exp(-glow * 2.5);
    
    // Color
    vec3 final = vec3(col);
    
    // Subtle warm center
    float center = 1.0 - length(uv * 0.5);
    center = max(0.0, center);
    final += vec3(center * 0.15, center * 0.08, center * 0.02);
    
    // Vignette
    float vig = 1.0 - 0.4 * dot(uv, uv);
    final *= vig;
    
    // Gamma
    final = pow(final, vec3(0.4545));
    
    fragColor = vec4(final, 1.0);
}