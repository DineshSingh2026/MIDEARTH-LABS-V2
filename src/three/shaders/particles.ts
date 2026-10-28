/** Event river: 3 coloured streams merging into one white river. Paths evaluated in the shader. */
export const riverVert = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform float uVis;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uWhite;
attribute float aStream;
attribute float aPhase;
attribute float aSpeed;
attribute vec3 aOff;
varying vec3 vC;
varying float vA;

vec3 bez(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
  float it = 1.0 - t;
  return it * it * it * a + 3.0 * it * it * t * b + 3.0 * it * t * t * c + t * t * t * d;
}

void main() {
  float u = fract(aPhase + uTime * aSpeed);
  float ys = (aStream - 1.0) * 1.55;
  vec3 p;
  float spread;
  float merged;
  if (u < 0.5) {
    float t = u / 0.5;
    p = bez(vec3(-7.0, ys * 1.1, -0.6 * abs(ys)), vec3(-3.8, ys, 0.0), vec3(-1.7, ys * 0.2, 0.0), vec3(-0.15, 0.0, 0.0), t);
    spread = mix(1.0, 0.25, t);
    merged = smoothstep(0.7, 1.0, t);
  } else {
    float t = (u - 0.5) / 0.5;
    p = vec3(0.15 + t * 7.0, sin(t * 5.0 - uTime * 1.1) * 0.22 * t, 0.0);
    spread = 0.35 + t * 0.9;
    merged = 1.0;
  }
  p += aOff * spread * 0.2;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float sz = (0.035 + 0.02 * fract(aPhase * 13.0)) * (1.0 + merged * 0.25);
  gl_PointSize = clamp(sz * uScale / max(0.1, -mv.z), 0.0, 32.0);
  gl_Position = projectionMatrix * mv;
  vec3 sc = aStream < 0.5 ? uC0 : (aStream < 1.5 ? uC1 : uC2);
  vC = mix(sc, uWhite, merged);
  vA = uVis * smoothstep(0.0, 0.06, u) * smoothstep(1.0, 0.88, u) * (0.55 + 0.45 * sin(uTime * 3.0 + aPhase * 60.0));
}
`;

export const riverFrag = /* glsl */ `
uniform float uLight;
varying vec3 vC;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = (smoothstep(0.5, 0.0, d) * 0.5 + exp(-d * d * 40.0) * 0.7) * vA;
  if (a < 0.003) discard;
  gl_FragColor = vec4(mix(vC * 1.3, vC, uLight), clamp(a, 0.0, 1.0));
}
`;
