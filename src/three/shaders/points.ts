/**
 * Main "Living Network" point shader: crisp sprites (bright centre + small halo), strong
 * node/dust contrast, violet→cyan palette with hot white sparkles, per-group tints.
 */
export const particleVert = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uScale;
uniform float uTintAmt;
uniform float uFlash;
uniform float uLight;
uniform float uGroupTint;
uniform float uDepthFade;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uTint;
uniform vec3 uPal0;
uniform vec3 uPal1;
uniform vec3 uPal2;
uniform vec3 uPal3;
uniform vec3 uPal4;
uniform vec3 uPal5;
attribute float aSeed;
attribute float aSize;
attribute float aBright;
attribute float aTintIdx;
varying vec3 vColor;
varying float vAlpha;
varying float vHot;

vec3 pal(float i) {
  if (i < 0.5) return uPal0;
  if (i < 1.5) return uPal1;
  if (i < 2.5) return uPal2;
  if (i < 3.5) return uPal3;
  if (i < 4.5) return uPal4;
  return uPal5;
}

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.72 + 0.28 * sin(uTime * (1.2 + aSeed * 2.6) + aSeed * 41.0);
  float sparkle = pow(max(0.0, sin(uTime * 0.55 + aSeed * 97.0)), 40.0);
  float b = clamp(aBright, 0.0, 3.0);
  float hot = step(0.972, aSeed) * (1.0 - uLight);
  // strong contrast: dust is tiny and faint, nodes are larger and brighter
  float bb = pow(b, 1.4);
  // optional depth fade for spherical shapes (uDepthFade, currently unused = 0)
  vec3 vn = normalize(normalMatrix * (position + vec3(1e-4)));
  float df = mix(1.0, mix(0.12, 1.0, smoothstep(-0.2, 0.25, vn.z)), uDepthFade);
  float sz = uSize * aSize * (0.45 + 0.6 * min(b, 2.2)) * (1.0 + sparkle * 1.1 + uFlash * 0.8 + hot * 0.5);
  gl_PointSize = clamp(sz * mix(0.55, 1.0, df) * uScale / max(0.1, -mv.z), 0.0, 56.0);
  gl_Position = projectionMatrix * mv;

  float g = clamp(aSeed * 0.55 + (position.x * 0.1 + position.y * 0.07 + 0.5) * 0.45, 0.0, 1.0);
  vec3 c = mix(uColA, uColB, g);
  if (aTintIdx > -0.5) c = mix(c, pal(aTintIdx), uGroupTint);
  c = mix(c, uTint, uTintAmt * (0.35 + 0.65 * aSeed));
  c = mix(c, vec3(1.0), clamp(hot * 0.85 + sparkle * 0.6 + uFlash * 0.7, 0.0, 1.0) * (1.0 - uLight));
  vec3 dark = c * (0.6 + 0.5 * min(b, 2.0) + uFlash * 0.8);
  vColor = mix(dark, c, uLight);
  vHot = hot + sparkle;
  vAlpha = df * tw * clamp(bb, 0.0, 2.2) * mix(1.0, 0.8, uLight);
}
`;

export const particleFrag = /* glsl */ `
uniform float uOpacity;
uniform float uLight;
varying vec3 vColor;
varying float vAlpha;
varying float vHot;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if (d > 0.5) discard;
  float core = smoothstep(0.2, 0.02, d);
  float halo = exp(-d * d * 22.0) * mix(0.32, 0.18, uLight);
  float a = (core + halo) * vAlpha * uOpacity;
  vec3 c = mix(vColor, vec3(1.0), core * (0.25 + 0.4 * clamp(vHot, 0.0, 1.0)) * (1.0 - uLight));
  gl_FragColor = vec4(c, min(a, 1.0));
}
`;
