"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { site, engineColor, ACCENT } from "@/content/site";
import { runtime } from "./runtime";
import { ease, pointScale } from "./util3d";
import { CORE_Y, FLOOR_R, HEX_S, hexCentres, MONO_R, worldToHex } from "./targets/arena";
import { rng } from "./targets/util";

/* =====================================================================================
 * THE ARENA: a live agent economy.
 * Hex floor (infrastructure) · runtime crystal core · 14 engine monoliths with light rails
 * (every provider -> one stream) · competing agent swarms chasing task orbs.
 * ===================================================================================== */

const VIOLET = new THREE.Color("#A98CFF");
const CYAN = new THREE.Color("#6FD0FF");
const MAGENTA = new THREE.Color("#FF6AD5");
const INK_A = new THREE.Color("#3C2E9E");
const INK_B = new THREE.Color("#1F6FD6");
const WHITE = new THREE.Color(1, 1, 1);

const TEAM_HEX = [engineColor.claude, engineColor.codex, engineColor.grok, engineColor.gemini, ACCENT];
const N_RIP = 6;
const N_ORB = 3;
const N_BEAM = 4;

/** Shared, mutable arena state (no React re-renders). */
export const arena = {
  vis: 0,
  bootT: 1e6,
  flash: 0,
  flashCol: new THREE.Color("#ffffff"),
  rip: Array.from({ length: N_RIP }, () => new THREE.Vector4(0, 0, -100, 0)),
  ripNext: 0,
  orbs: Array.from({ length: N_ORB }, () => new THREE.Vector4(0, 0, 0, 0)), // x, z, glow, _
  sector: 0,
  sectorAmt: 0,
  /** 0..1: dims the arena on the left of the screen so the hero copy stays readable. */
  leftDim: 0,
  /** 0..1: pushes the near-camera fade further out (engines -> platform hand-off keeps the lower half clean). */
  nearK: 0,
  /** framebuffer width in px (for the screen-space left dim). */
  resX: 1,
};

export function addRipple(x: number, z: number, t: number, strength = 1) {
  arena.rip[arena.ripNext].set(x, z, t, strength);
  arena.ripNext = (arena.ripNext + 1) % N_RIP;
}

/* ------------------------------------------------------------------ glow sprite shader */
const spriteVert = /* glsl */ `
uniform float uScale;
attribute float aSize;
attribute vec3 aCol;
attribute float aAlpha;
varying vec3 vC;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uScale / max(0.1, -mv.z), 0.0, 512.0);
  gl_Position = projectionMatrix * mv;
  vC = aCol;
  vA = aAlpha;
}
`;
const spriteFrag = /* glsl */ `
uniform float uVis;
uniform float uLight;
varying vec3 vC;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = exp(-d * d * 28.0);
  float halo = exp(-d * d * 4.5) * 0.4;
  float a = (core + halo) * vA * uVis;
  vec3 c = mix(vC, vec3(1.0), core * 0.7 * (1.0 - uLight));
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
}
`;

function makeSprites(n: number) {
  const g = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  const size = new THREE.BufferAttribute(new Float32Array(n).fill(1), 1);
  const col = new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3);
  const alpha = new THREE.BufferAttribute(new Float32Array(n), 1);
  g.setAttribute("position", pos);
  g.setAttribute("aSize", size);
  g.setAttribute("aCol", col);
  g.setAttribute("aAlpha", alpha);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
  const uniforms = { uScale: { value: 1000 }, uVis: { value: 0 }, uLight: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: spriteVert, fragmentShader: spriteFrag, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  return { g, pos, size, col, alpha, mat, uniforms };
}

/* ------------------------------------------------------------------ hex floor */
const floorVert = /* glsl */ `
attribute vec4 aTile; // radial dist, sector, seed, height
varying vec3 vLocal;
varying vec3 vWorld;
varying vec4 vTile;
varying float vTop;
void main() {
  vLocal = position;
  vTile = aTile;
  vTop = step(0.5, normal.y);
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const floorFrag = /* glsl */ `
uniform float uTime;
uniform float uVis;
uniform float uBoot;
uniform float uLight;
uniform float uSector;
uniform float uSectorAmt;
uniform float uFlash;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uFlashCol;
uniform vec4 uRip[${N_RIP}];
uniform vec4 uOrb[${N_ORB}];
uniform float uLeftDim;
uniform float uResX;
uniform float uNearK;
varying vec3 vLocal;
varying vec3 vWorld;
varying vec4 vTile;
varying float vTop;

float hexd(vec2 p) {
  p = abs(p);
  return max(p.x, dot(p, vec2(0.5, 0.8660254))) / 0.8660254;
}
float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  float r = vTile.x;
  float seed = vTile.z;
  float h = vTile.w;
  float since = uTime - uBoot;
  // boot: ignition ring sweeping outward from the core
  float bootR = since * 7.5;
  float lit = since < 0.0 ? 0.0 : smoothstep(bootR + 0.5, bootR - 1.5, r);
  float ignite = since < 0.0 ? 0.0 : exp(-pow((r - bootR) * 0.9, 2.0)) * (1.0 - smoothstep(10.0, 16.0, bootR));
  // heartbeat wave every 4.5s
  float hb = mod(uTime, 4.5) * 5.5;
  float beat = exp(-pow((r - hb) * 1.1, 2.0)) * (1.0 - smoothstep(4.0, 15.0, hb) * 0.7);
  // capture ripples
  float rip = 0.0;
  for (int i = 0; i < ${N_RIP}; i++) {
    float age = uTime - uRip[i].z;
    if (age < 0.0 || age > 2.0) continue;
    float d = length(vWorld.xz - uRip[i].xy);
    rip += exp(-pow((d - age * 4.2) * 2.2, 2.0)) * (1.0 - age / 2.0) * uRip[i].w;
  }
  // task orbs light their tiles
  float orb = 0.0;
  for (int i = 0; i < ${N_ORB}; i++) {
    float d = length(vWorld.xz - uOrb[i].xy);
    orb += uOrb[i].z * exp(-d * d * 1.6);
  }
  float pool = exp(-r * r * 0.12);
  float sec = uSectorAmt * (1.0 - step(0.5, abs(vTile.y - uSector)));
  float act = beat * 0.55 + rip * 1.6 + orb * 1.3 + pool * 0.7 + sec * 0.8 + ignite * 1.6;

  float fog = 1.0 - smoothstep(7.5, 14.0, r);
  vec3 edgeCol = mix(uA, uB, 0.5 + 0.5 * sin(seed * 6.2831 + r * 0.32 - uTime * 0.15));
  // linear space (the composer converts to sRGB): keep the glass genuinely dark
  vec3 base = mix(vec3(0.004, 0.0035, 0.012), vec3(0.011, 0.008, 0.03), seed);
  vec3 col;
  float hd = hexd(vLocal.xz);
  if (vTop > 0.5) {
    float edge = smoothstep(0.83, 0.97, hd);
    float inner = smoothstep(0.55, 0.0, hd);
    // glassy top: faint inner sheen + reflected core light + glowing rim
    col = base + vec3(0.006, 0.005, 0.018) * inner;
    col += edgeCol * edge * (0.2 + act * 1.5);
    col += edgeCol * (1.0 - hd) * act * 0.22;
    col += uFlashCol * pool * uFlash * 0.7;
    // rare idle twinkle
    col += edgeCol * edge * step(0.985, hash(seed * 91.0 + floor(uTime * 0.7))) * 0.8;
  } else {
    float y = vLocal.y + 0.5;
    col = base * 0.6 + edgeCol * smoothstep(0.8, 1.0, y) * (0.18 + act * 0.8);
    if (h > 0.3) {
      // server-block LEDs
      float ang = atan(vLocal.x, vLocal.z) / 6.2831 + 0.5;
      float rows = y * h * 16.0;
      float colsF = ang * 18.0;
      float on = step(0.45, hash(floor(rows) * 12.99 + floor(colsF) * 78.23 + seed * 43.0));
      float blink = step(0.25, fract(uTime * (0.3 + seed) + hash(floor(rows) + seed * 7.0)));
      float d2 = length(vec2(fract(rows) - 0.5, fract(colsF) - 0.5));
      float led = smoothstep(0.32, 0.12, d2) * on * blink * step(0.08, y) * step(y, 0.92);
      col += mix(uB, vec3(0.55, 1.0, 0.8), seed) * led * 1.8;
    }
  }
  col *= mix(0.25, 1.0, lit);
  col += edgeCol * ignite * 0.6 * (vTop > 0.5 ? smoothstep(0.7, 1.0, hd) : 0.3);
  // light theme: pale glass tiles with ink rims
  vec3 lightCol = mix(vec3(0.95, 0.94, 0.99) - seed * 0.03, edgeCol, clamp((vTop > 0.5 ? smoothstep(0.83, 0.97, hd) : 0.15) * (0.6 + act), 0.0, 1.0));
  col = mix(col, lightCol, uLight);
  float sx = gl_FragCoord.x / uResX;
  float dim = mix(1.0, mix(0.22, 1.0, smoothstep(0.12, 0.55, sx)), uLeftDim);
  float near = smoothstep(mix(3.0, 9.5, uNearK), mix(7.5, 16.0, uNearK), distance(cameraPosition, vWorld));
  near = near * near * (uNearK > 0.01 ? near : 1.0); // steeper so faded dark glass never reads as a silhouette
  gl_FragColor = vec4(col * mix(dim, 1.0, uLight), fog * near * uVis * mix(1.0, dim, uLight));
}
`;

function HexFloor() {
  const tiles = useMemo(() => hexCentres(FLOOR_R), []);
  const { geo, mat, mesh, index } = useMemo(() => {
    const r = rng(1212);
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
    const n = tiles.length;
    const aTile = new Float32Array(n * 4);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const uniforms = {
      uTime: { value: 0 }, uVis: { value: 0 }, uBoot: { value: 1e6 }, uLight: { value: 0 },
      uSector: { value: 0 }, uSectorAmt: { value: 0 }, uFlash: { value: 0 },
      uA: { value: VIOLET.clone() }, uB: { value: CYAN.clone() }, uFlashCol: { value: new THREE.Color("#ffffff") },
      uRip: { value: arena.rip }, uOrb: { value: arena.orbs },
      uLeftDim: { value: 0 }, uResX: { value: 1 }, uNearK: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: floorVert, fragmentShader: floorFrag, uniforms, transparent: true, depthWrite: true });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const index = new Map<string, number>();
    tiles.forEach((tl, i) => {
      const d = Math.hypot(tl.x, tl.z);
      const server = d > 2.2 && d < 11 && r() < 0.075;
      const h = server ? 0.35 + r() * 0.7 : 0.08 + r() * 0.06;
      p.set(tl.x, h / 2 - 0.02, tl.z);
      s.set(HEX_S * 0.92, h, HEX_S * 0.92);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      const ang = Math.atan2(tl.z, tl.x) + Math.PI;
      aTile[i * 4] = d;
      aTile[i * 4 + 1] = Math.min(5, Math.floor((ang / (Math.PI * 2)) * 6));
      aTile[i * 4 + 2] = r();
      aTile[i * 4 + 3] = h;
      index.set(`${tl.q},${tl.r}`, i);
    });
    geo.setAttribute("aTile", new THREE.InstancedBufferAttribute(aTile, 4));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = -2;
    return { geo, mat, mesh, index };
  }, [tiles]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); mesh.dispose(); }, [geo, mat, mesh]);

  const st = useMemo(() => ({ theme: "", frame: 0, hover: null as string | null, ray: new THREE.Raycaster(), plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1), hit: new THREE.Vector3(), v2: new THREE.Vector2() }), []);

  useFrame((state) => {
    const s = useStore.getState();
    const u = mat.uniforms;
    if (st.theme !== s.theme) {
      st.theme = s.theme;
      const light = s.theme === "light";
      u.uLight.value = light ? 1 : 0;
      u.uA.value.copy(light ? INK_A : VIOLET);
      u.uB.value.copy(light ? INK_B : CYAN);
    }
    u.uTime.value = state.clock.elapsedTime;
    u.uVis.value = arena.vis;
    u.uBoot.value = arena.bootT;
    u.uSector.value = arena.sector;
    u.uSectorAmt.value = arena.sectorAmt;
    u.uFlash.value = arena.flash;
    u.uFlashCol.value.copy(arena.flashCol);
    u.uLeftDim.value = arena.leftDim;
    u.uResX.value = arena.resX;
    u.uNearK.value = arena.nearK;
    mesh.visible = arena.vis > 0.01;

    // hoverNode: tile under the cursor (cheap: ray-plane + axial rounding)
    st.frame++;
    const m = runtime.mouse;
    if (arena.vis > 0.5 && m.active && m.moved && st.frame % 4 === 0 && (s.chapter === "hero" || s.chapter === "engines")) {
      m.moved = false;
      st.v2.set(m.x, m.y);
      st.ray.setFromCamera(st.v2, state.camera);
      let id: string | null = null;
      if (st.ray.ray.intersectPlane(st.plane, st.hit)) {
        const hx = worldToHex(st.hit.x, st.hit.z);
        const idx = index.get(`${hx.q},${hx.r}`);
        if (idx !== undefined && Math.hypot(st.hit.x, st.hit.z) < 11) id = "node_0x" + idx.toString(16);
      }
      if (id !== st.hover) { st.hover = id; s.set({ hoverNode: id }); }
    } else if (st.hover !== null && (arena.vis < 0.5 || !m.active)) {
      st.hover = null;
      s.set({ hoverNode: null });
    }
  });

  return <primitive object={mesh} />;
}

/* ------------------------------------------------------------------ runtime core */
const crystalVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  vP = position;
  gl_Position = projectionMatrix * mv;
}
`;
const crystalFrag = /* glsl */ `
uniform float uTime;
uniform float uVis;
uniform float uFlash;
uniform float uLight;
uniform vec3 uFlashCol;
uniform vec3 uV;
uniform vec3 uC;
uniform vec3 uM;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
  float ph = f * 1.4 + vP.y * 0.6 + uTime * 0.12;
  vec3 irid = mix(mix(uV, uC, 0.5 + 0.5 * sin(ph * 6.2831)), uM, 0.32 * (0.5 + 0.5 * sin(ph * 6.2831 + 2.1)));
  float pulse = 0.5 + 0.5 * sin(uTime * 2.2);
  vec3 col = irid * (0.22 + pow(f, 1.4) * 1.7) + vec3(1.0, 0.95, 1.0) * (1.0 - f) * (0.18 + pulse * 0.22);
  col += uFlashCol * uFlash * (0.6 + f);
  vec3 lightCol = mix(irid * 0.85, vec3(0.2, 0.15, 0.45), 1.0 - f);
  col = mix(col, lightCol, uLight);
  gl_FragColor = vec4(col, (0.62 + f * 0.38) * uVis);
}
`;
const beamVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
varying float vAng;
void main() {
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  vAng = atan(position.x, position.z);
  gl_Position = projectionMatrix * mv;
}
`;
const beamFrag = /* glsl */ `
uniform float uTime;
uniform float uVis;
uniform vec3 uCol;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
varying float vAng;
void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float rays = 0.55 + 0.45 * sin(vAng * 13.0 + uTime * 0.25) * sin(vAng * 7.0 - uTime * 0.18);
  float a = pow(facing, 1.6) * mix(0.25, 1.0, vUv.y) * rays * 0.16 * uVis;
  gl_FragColor = vec4(uCol, a);
}
`;

function Core() {
  const group = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const parts = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.95, 0);
    const mat = new THREE.ShaderMaterial({
      vertexShader: crystalVert, fragmentShader: crystalFrag, transparent: true, depthWrite: true,
      uniforms: {
        uTime: { value: 0 }, uVis: { value: 0 }, uFlash: { value: 0 }, uLight: { value: 0 },
        uFlashCol: { value: new THREE.Color("#ffffff") }, uV: { value: VIOLET.clone() }, uC: { value: CYAN.clone() }, uM: { value: MAGENTA.clone() },
      },
    });
    const inner = new THREE.IcosahedronGeometry(0.42, 1);
    const innerMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const ringGeos = [1.45, 1.85, 2.3].map((R) => new THREE.TorusGeometry(R, 0.009, 6, 200));
    const ringMats = [CYAN, VIOLET, MAGENTA].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    const beamGeo = new THREE.ConeGeometry(2.2, CORE_Y, 64, 1, true);
    const beamMat = new THREE.ShaderMaterial({ vertexShader: beamVert, fragmentShader: beamFrag, uniforms: { uTime: { value: 0 }, uVis: { value: 0 }, uCol: { value: new THREE.Color("#B9A4FF") } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const glow = makeSprites(2);
    const edges = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: "#DDF4FF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    return { geo, mat, inner, innerMat, ringGeos, ringMats, beamGeo, beamMat, glow, edges, edgeMat };
  }, []);
  useEffect(() => () => {
    parts.geo.dispose(); parts.mat.dispose(); parts.inner.dispose(); parts.innerMat.dispose();
    parts.ringGeos.forEach((g) => g.dispose()); parts.ringMats.forEach((m) => m.dispose());
    parts.beamGeo.dispose(); parts.beamMat.dispose(); parts.glow.g.dispose(); parts.glow.mat.dispose();
    parts.edges.dispose(); parts.edgeMat.dispose();
  }, [parts]);

  const theme = useRef("");
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const t = state.clock.elapsedTime;
    const s = useStore.getState();
    const v = arena.vis;
    const light = s.theme === "light";
    if (theme.current !== s.theme) {
      theme.current = s.theme;
      parts.mat.uniforms.uLight.value = light ? 1 : 0;
      parts.glow.uniforms.uLight.value = light ? 1 : 0;
      const b = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      for (const m of [...parts.ringMats, parts.beamMat, parts.glow.mat, parts.innerMat]) { m.blending = b; m.needsUpdate = true; }
    }
    if (group.current) group.current.visible = v > 0.01;
    const cta = s.chapter === "cta";
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    const u = parts.mat.uniforms;
    u.uTime.value = t; u.uVis.value = v; u.uFlash.value = arena.flash; u.uFlashCol.value.copy(arena.flashCol);
    parts.innerMat.opacity = v * (0.5 + pulse * 0.4 + arena.flash);
    parts.edgeMat.opacity = v * (light ? 0.5 : 0.75 + arena.flash * 0.25);
    parts.innerMat.color.copy(arena.flash > 0.05 ? arena.flashCol : CYAN).lerp(WHITE, 0.5);
    parts.ringMats.forEach((m, i) => { m.opacity = v * (light ? 0.6 : 0.5 + (cta ? 0.3 : 0)) * (0.7 + 0.3 * Math.sin(t * 1.3 + i)); });
    parts.beamMat.uniforms.uTime.value = t;
    parts.beamMat.uniforms.uVis.value = v * (cta ? 1.4 : 1) * (light ? 0.5 : 1);
    if (crystal.current) {
      crystal.current.rotation.y += dt * (cta ? 0.6 : 0.28);
      crystal.current.rotation.x = 0.35 + Math.sin(t * 0.3) * 0.12;
      crystal.current.position.y = CORE_Y + Math.sin(t * 0.8) * 0.08;
    }
    rings.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.x = Math.PI / 2 + Math.sin(t * 0.21 + i * 2) * (0.35 + i * 0.12);
      r.rotation.y += dt * (0.25 - i * 0.17);
      r.position.y = CORE_Y + Math.sin(t * 0.8) * 0.08;
    });
    // glow sprites: hot inner light + wide nebula halo
    const g = parts.glow;
    const pa = g.pos.array as Float32Array, sz = g.size.array as Float32Array, al = g.alpha.array as Float32Array, co = g.col.array as Float32Array;
    pa[1] = CORE_Y; pa[4] = CORE_Y;
    sz[0] = 2.4 + pulse * 0.4 + arena.flash * 2.5; sz[1] = 11 + (cta ? 4 : 0);
    al[0] = 0.9; al[1] = 0.22 + arena.flash * 0.3;
    const c0 = arena.flash > 0.05 ? arena.flashCol : VIOLET;
    co[0] = c0.r; co[1] = c0.g; co[2] = c0.b;
    co[3] = 0.45; co[4] = 0.35; co[5] = 0.95;
    g.pos.needsUpdate = true; g.size.needsUpdate = true; g.alpha.needsUpdate = true; g.col.needsUpdate = true;
    g.uniforms.uVis.value = v * (light ? 0.5 : 1);
    g.uniforms.uScale.value = pointScale(state);
  });

  return (
    <group ref={group}>
      <mesh ref={crystal} geometry={parts.geo} material={parts.mat} position={[0, CORE_Y, 0]} renderOrder={1}>
        <lineSegments geometry={parts.edges} material={parts.edgeMat} scale={1.004} renderOrder={2} />
      </mesh>
      <mesh geometry={parts.inner} material={parts.innerMat} position={[0, CORE_Y, 0]} renderOrder={2} />
      {parts.ringGeos.map((g, i) => (
        <mesh key={i} ref={(el) => { rings.current[i] = el; }} geometry={g} material={parts.ringMats[i]} position={[0, CORE_Y, 0]} renderOrder={3} />
      ))}
      <mesh geometry={parts.beamGeo} material={parts.beamMat} position={[0, CORE_Y / 2, 0]} renderOrder={4} />
      <points geometry={parts.glow.g} material={parts.glow.mat} frustumCulled={false} renderOrder={5} />
    </group>
  );
}

/* ------------------------------------------------------------------ engine monoliths + light rails */
const ENGINES = site.engineRail.engines;
const N_MONO = ENGINES.length;
const monoColors = ENGINES.map((e, i) => {
  const hex = engineColor[e.slug];
  if (hex) return new THREE.Color(hex);
  // non-branded engines: accent violet drifting toward cyan around the ring
  return VIOLET.clone().lerp(CYAN, (i % 5) / 8);
});
const monoPos = ENGINES.map((_, i) => {
  const a = (i / N_MONO) * Math.PI * 2 + Math.PI / N_MONO;
  return new THREE.Vector3(Math.cos(a) * MONO_R, 0, Math.sin(a) * MONO_R);
});
const monoH = ENGINES.map((_, i) => 2.3 + ((i * 7) % 5) * 0.32);

const monoVert = /* glsl */ `
attribute vec3 aCol;
attribute float aFlare;
attribute float aLit;
varying vec3 vL;
varying vec3 vNl;
varying vec3 vCol;
varying float vFlare;
varying float vLit;
varying vec3 vW;
void main() {
  vW = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
  vL = position;
  vNl = normal;
  vCol = aCol;
  vFlare = aFlare;
  vLit = aLit;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}
`;
const monoFrag = /* glsl */ `
uniform float uTime;
uniform float uVis;
uniform float uLight;
uniform float uLeftDim;
uniform float uResX;
uniform float uNearK;
varying vec3 vL;
varying vec3 vNl;
varying vec3 vCol;
varying float vFlare;
varying float vLit;
varying vec3 vW;
void main() {
  float y = vL.y + 0.5;
  float side = abs(vNl.y) < 0.5 ? 1.0 : 0.0;
  float u = abs(vNl.x) > 0.5 ? vL.z : vL.x;
  float edge = smoothstep(0.38, 0.5, abs(u));
  float streak = smoothstep(0.07, 0.0, abs(u)) * side;
  float scan = exp(-pow((y - fract(uTime * 0.18 + vCol.r * 3.1)) * 12.0, 2.0));
  float cap = (1.0 - side) * step(0.0, vL.y);
  float grad = pow(y, 2.2);
  float k = (0.35 + vFlare * 1.8) * vLit;
  vec3 glass = vec3(0.006, 0.005, 0.016) + vCol * 0.012;
  vec3 col = glass + vCol * (edge * side * (0.25 + grad * 0.9) + streak * (0.3 + grad * 1.4 + scan * 1.5) + cap * 2.6) * k;
  vec3 lightCol = mix(vec3(0.94, 0.93, 0.99), vCol * 0.8, clamp(edge * side + streak + cap, 0.0, 1.0) * (0.5 + vFlare));
  col = mix(col, lightCol, uLight);
  // pillars close to the camera dissolve so they never block the view
  float near = smoothstep(mix(6.5, 13.0, uNearK), mix(11.0, 19.0, uNearK), distance(cameraPosition, vW));
  float sx = gl_FragCoord.x / uResX;
  float dim = mix(1.0, mix(0.25, 1.0, smoothstep(0.12, 0.55, sx)), uLeftDim);
  gl_FragColor = vec4(col * dim, uVis * near);
}
`;

const railVert = /* glsl */ `
uniform vec3 uRailCol[${N_MONO}];
uniform float uRailFlare[${N_MONO}];
attribute float aRail;
varying float vT;
varying vec3 vCol;
varying float vFlare;
varying float vIdx;
void main() {
  int i = int(aRail + 0.5);
  vCol = uRailCol[i];
  vFlare = uRailFlare[i];
  vIdx = aRail;
  vT = uv.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const railFrag = /* glsl */ `
uniform float uTime;
uniform float uVis;
uniform float uLit;
uniform float uLight;
varying float vT;
varying vec3 vCol;
varying float vFlare;
varying float vIdx;
void main() {
  float p1 = fract(uTime * 0.26 + vIdx * 0.137);
  float p2 = fract(p1 + 0.5);
  float pulses = exp(-pow((vT - p1) * 16.0, 2.0)) + exp(-pow((vT - p2) * 16.0, 2.0));
  float flood = vFlare * (0.6 + 0.4 * sin(vT * 40.0 - uTime * 12.0));
  float a = (0.1 + pulses * 1.1 + flood * 0.9) * uVis * uLit;
  // merge toward white as the stream nears the core
  vec3 c = mix(vCol, vec3(1.0), smoothstep(0.7, 1.0, vT) * 0.6 + pulses * 0.35);
  gl_FragColor = vec4(mix(c * 1.2, vCol, uLight), clamp(a, 0.0, 1.0));
}
`;

function Monoliths() {
  const parts = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const n = N_MONO;
    const aCol = new Float32Array(n * 3);
    const aFlare = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    const aLit = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    aFlare.setUsage(THREE.DynamicDrawUsage);
    aLit.setUsage(THREE.DynamicDrawUsage);
    monoColors.forEach((c, i) => { aCol[i * 3] = c.r; aCol[i * 3 + 1] = c.g; aCol[i * 3 + 2] = c.b; });
    geo.setAttribute("aCol", new THREE.InstancedBufferAttribute(aCol, 3));
    geo.setAttribute("aFlare", aFlare);
    geo.setAttribute("aLit", aLit);
    const mat = new THREE.ShaderMaterial({ vertexShader: monoVert, fragmentShader: monoFrag, uniforms: { uTime: { value: 0 }, uVis: { value: 0 }, uLight: { value: 0 }, uLeftDim: { value: 0 }, uResX: { value: 1 }, uNearK: { value: 0 } }, transparent: true, depthWrite: true });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    monoPos.forEach((mp, i) => {
      q.setFromAxisAngle(up, -Math.atan2(mp.z, mp.x) + Math.PI / 4);
      p.set(mp.x, monoH[i] / 2, mp.z);
      s.set(0.34, monoH[i], 0.34);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.frustumCulled = false;

    // rails: merged tubes, one draw call
    const tubes: THREE.BufferGeometry[] = [];
    monoPos.forEach((mp, i) => {
      const dir = mp.clone().normalize();
      const tang = new THREE.Vector3(-dir.z, 0, dir.x);
      const p0 = new THREE.Vector3(mp.x * 0.96, 0.16, mp.z * 0.96);
      const p1 = dir.clone().multiplyScalar(MONO_R * 0.55).addScaledVector(tang, 1.6).setY(0.16);
      const p2 = dir.clone().multiplyScalar(1.6).addScaledVector(tang, 0.6).setY(0.4);
      const p3 = new THREE.Vector3(0, CORE_Y - 0.75, 0);
      const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
      const tube = new THREE.TubeGeometry(curve, 90, 0.016, 5, false);
      const cnt = tube.attributes.position.count;
      tube.setAttribute("aRail", new THREE.BufferAttribute(new Float32Array(cnt).fill(i), 1));
      tubes.push(tube);
    });
    const railGeo = mergeGeos(tubes);
    tubes.forEach((t) => t.dispose());
    const railMat = new THREE.ShaderMaterial({
      vertexShader: railVert, fragmentShader: railFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uVis: { value: 0 }, uLit: { value: 0 }, uLight: { value: 0 },
        uRailCol: { value: monoColors.map((c) => c.clone()) },
        uRailFlare: { value: new Array(N_MONO).fill(0) },
      },
    });
    const caps = makeSprites(n * 2);
    return { geo, mat, mesh, aFlare, aLit, railGeo, railMat, caps };
  }, []);
  useEffect(() => () => {
    parts.geo.dispose(); parts.mat.dispose(); parts.mesh.dispose(); parts.railGeo.dispose(); parts.railMat.dispose();
    parts.caps.g.dispose(); parts.caps.mat.dispose();
  }, [parts]);

  const flare = useMemo(() => new Float32Array(N_MONO), []);
  const theme = useRef("");
  const group = useRef<THREE.Group>(null);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const t = state.clock.elapsedTime;
    const s = useStore.getState();
    const v = arena.vis;
    const light = s.theme === "light";
    if (theme.current !== s.theme) {
      theme.current = s.theme;
      parts.mat.uniforms.uLight.value = light ? 1 : 0;
      parts.railMat.uniforms.uLight.value = light ? 1 : 0;
      parts.caps.uniforms.uLight.value = light ? 1 : 0;
      const b = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      parts.railMat.blending = b; parts.caps.mat.blending = b;
      parts.railMat.needsUpdate = true; parts.caps.mat.needsUpdate = true;
    }
    if (group.current) group.current.visible = v > 0.01;
    const hovered = s.engineColor ? s.engineColor.toLowerCase() : null;
    const allLit = s.chapter === "cta";
    const since = t - arena.bootT;
    const fl = parts.aFlare.array as Float32Array;
    const lt = parts.aLit.array as Float32Array;
    const rf = parts.railMat.uniforms.uRailFlare.value as number[];
    const pa = parts.caps.pos.array as Float32Array, ps = parts.caps.size.array as Float32Array, pal = parts.caps.alpha.array as Float32Array, pc = parts.caps.col.array as Float32Array;
    for (let i = 0; i < N_MONO; i++) {
      const slug = ENGINES[i].slug;
      const match = hovered && (engineColor[slug] ?? ACCENT).toLowerCase() === hovered;
      const goal = match ? 1 : allLit ? 0.55 : 0;
      flare[i] += (goal - flare[i]) * ease(match ? 0.15 : 0.05, dt);
      fl[i] = flare[i];
      rf[i] = flare[i];
      // boot: monoliths light one by one around the ring
      lt[i] = since < 0 ? 0 : Math.min(1, Math.max(0, (since - 0.7 - i * 0.11) / 0.35));
      const c = monoColors[i];
      const mp = monoPos[i];
      // top cap glow + base glow
      pa[i * 6] = mp.x; pa[i * 6 + 1] = monoH[i] + 0.05; pa[i * 6 + 2] = mp.z;
      pa[i * 6 + 3] = mp.x * 0.97; pa[i * 6 + 4] = 0.12; pa[i * 6 + 5] = mp.z * 0.97;
      ps[i * 2] = 0.9 + flare[i] * 1.6; ps[i * 2 + 1] = 1.6 + flare[i] * 1.5;
      pal[i * 2] = lt[i] * (0.75 + flare[i]); pal[i * 2 + 1] = lt[i] * (0.25 + flare[i] * 0.6);
      pc[i * 6] = c.r; pc[i * 6 + 1] = c.g; pc[i * 6 + 2] = c.b;
      pc[i * 6 + 3] = c.r; pc[i * 6 + 4] = c.g; pc[i * 6 + 5] = c.b;
    }
    parts.aFlare.needsUpdate = true;
    parts.aLit.needsUpdate = true;
    parts.caps.pos.needsUpdate = true; parts.caps.size.needsUpdate = true; parts.caps.alpha.needsUpdate = true; parts.caps.col.needsUpdate = true;
    parts.mat.uniforms.uTime.value = t;
    parts.mat.uniforms.uVis.value = v;
    parts.mat.uniforms.uLeftDim.value = arena.leftDim;
    parts.mat.uniforms.uResX.value = arena.resX;
    parts.mat.uniforms.uNearK.value = arena.nearK;
    parts.railMat.uniforms.uTime.value = t;
    parts.railMat.uniforms.uVis.value = v;
    parts.railMat.uniforms.uLit.value = since < 0 ? 0 : Math.min(1, Math.max(0, (since - 1.2) / 1.0));
    parts.caps.uniforms.uVis.value = v * (light ? 0.5 : 1);
    parts.caps.uniforms.uScale.value = pointScale(state);
  });

  return (
    <group ref={group}>
      <primitive object={parts.mesh} />
      <mesh geometry={parts.railGeo} material={parts.railMat} frustumCulled={false} renderOrder={3} />
      <points geometry={parts.caps.g} material={parts.caps.mat} frustumCulled={false} renderOrder={6} />
    </group>
  );
}

function mergeGeos(geos: THREE.BufferGeometry[]) {
  let vCount = 0, iCount = 0;
  for (const g of geos) { vCount += g.attributes.position.count; iCount += g.index ? g.index.count : 0; }
  const pos = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2), rail = new Float32Array(vCount);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array as Float32Array, vo * 3);
    uv.set(g.attributes.uv.array as Float32Array, vo * 2);
    rail.set(g.attributes.aRail.array as Float32Array, vo);
    if (g.index) {
      const src = g.index.array;
      for (let k = 0; k < src.length; k++) idx[io + k] = src[k] + vo;
      io += src.length;
    }
    vo += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setAttribute("aRail", new THREE.BufferAttribute(rail, 1));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
  return out;
}

/* ------------------------------------------------------------------ agent swarms + task orbs */
const swarmVert = /* glsl */ `
uniform float uScale;
uniform float uTime;
uniform vec3 uTeamCol[5];
uniform float uTeamBoost[5];
attribute float aTeam;
attribute float aSeed;
varying vec3 vC;
varying float vA;
void main() {
  int ti = int(aTeam + 0.5);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float boost = uTeamBoost[ti];
  float tw = 0.75 + 0.25 * sin(uTime * 4.0 + aSeed * 50.0);
  gl_PointSize = clamp((0.055 + aSeed * 0.05) * (1.0 + boost * 0.8) * uScale / max(0.1, -mv.z), 0.0, 40.0);
  gl_Position = projectionMatrix * mv;
  vC = uTeamCol[ti];
  vA = tw * (0.7 + boost * 0.8);
}
`;
const swarmFrag = /* glsl */ `
uniform float uVis;
uniform float uLight;
varying vec3 vC;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.45, 0.0, d);
  float halo = exp(-d * d * 5.0) * 0.35;
  vec3 c = mix(vC, vec3(1.0), core * 0.45 * (1.0 - uLight));
  gl_FragColor = vec4(c * mix(1.3, 1.0, uLight), clamp((core + halo) * vA * uVis, 0.0, 1.0));
}
`;

type Team = { c: THREE.Vector3; target: THREE.Vector3; orb: number; ph: number; f: number; boost: number };
type Orb = { active: boolean; x: number; z: number; born: number; team: number; glow: number };
type Beam = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; start: number };

function Swarms({ count }: { count: number }) {
  const sim = useMemo(() => {
    const r = rng(77);
    const n = count;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const team = new Float32Array(n);
    const seed = new Float32Array(n);
    const rad = new Float32Array(n);
    const w = new Float32Array(n);
    const ph = new Float32Array(n);
    const tilt = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      team[i] = i % 5;
      seed[i] = r();
      rad[i] = 0.25 + Math.pow(r(), 0.7) * 1.3;
      w[i] = (0.8 + r() * 1.6) * (r() < 0.5 ? -1 : 1);
      ph[i] = r() * Math.PI * 2;
      tilt[i] = (r() - 0.5) * 1.4;
      pos[i * 3] = 0; pos[i * 3 + 1] = CORE_Y; pos[i * 3 + 2] = 0;
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pos, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", posAttr);
    geo.setAttribute("aTeam", new THREE.BufferAttribute(team, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    const uniforms = {
      uScale: { value: 1000 }, uTime: { value: 0 }, uVis: { value: 0 }, uLight: { value: 0 },
      uTeamCol: { value: TEAM_HEX.map((h) => new THREE.Color(h)) },
      uTeamBoost: { value: [0, 0, 0, 0, 0] },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: swarmVert, fragmentShader: swarmFrag, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const teams: Team[] = Array.from({ length: 5 }, (_, k) => ({ c: new THREE.Vector3(0, CORE_Y, 0), target: new THREE.Vector3(), orb: -1, ph: k * 1.3, f: 0.8 + k * 0.17, boost: 0 }));
    const orbs: Orb[] = Array.from({ length: N_ORB }, () => ({ active: false, x: 0, z: 0, born: 0, team: -1, glow: 0 }));
    const orbSprites = makeSprites(N_ORB);
    const beamGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 8, 1, true);
    beamGeo.translate(0, 0.5, 0);
    const beams: Beam[] = Array.from({ length: N_BEAM }, () => {
      const mat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.Mesh(beamGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      return { mesh, mat, start: -100 };
    });
    const tiles = hexCentres(8.5).filter((h) => Math.hypot(h.x, h.z) > 2.6);
    return { n, pos, vel, team, rad, w, ph, tilt, geo, posAttr, mat, uniforms, teams, orbs, orbSprites, beamGeo, beams, tiles, lastSpawn: 0, nextBeam: 0, burstDone: false };
  }, [count]);
  useEffect(() => () => {
    sim.geo.dispose(); sim.mat.dispose(); sim.orbSprites.g.dispose(); sim.orbSprites.mat.dispose();
    sim.beamGeo.dispose(); sim.beams.forEach((b) => b.mat.dispose());
  }, [sim]);

  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), core: new THREE.Vector3(0, CORE_Y, 0) }), []);
  const theme = useRef("");
  const group = useRef<THREE.Group>(null);

  useFrame((state, dtRaw) => {
    const s = useStore.getState();
    const v = arena.vis;
    if (group.current) group.current.visible = v > 0.01;
    if (v < 0.01) return;
    const dt = Math.min(dtRaw, 0.05);
    const t = state.clock.elapsedTime;
    const light = s.theme === "light";
    const U = sim.uniforms;
    if (theme.current !== s.theme) {
      theme.current = s.theme;
      U.uLight.value = light ? 1 : 0;
      (U.uTeamCol.value as THREE.Color[])[2].set(light ? "#1A1A2E" : engineColor.grok);
      const b = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      sim.mat.blending = b; sim.orbSprites.mat.blending = b;
      sim.mat.needsUpdate = true; sim.orbSprites.mat.needsUpdate = true;
      sim.orbSprites.uniforms.uLight.value = light ? 1 : 0;
    }
    const since = t - arena.bootT;
    // boot: swarms burst out of the core
    if (since >= 0.4 && !sim.burstDone) {
      sim.burstDone = true;
      for (let i = 0; i < sim.n; i++) {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, sq = Math.sqrt(1 - u * u);
        const sp = 6 + Math.random() * 10;
        sim.pos[i * 3] = 0; sim.pos[i * 3 + 1] = CORE_Y; sim.pos[i * 3 + 2] = 0;
        sim.vel[i * 3] = sq * Math.cos(th) * sp; sim.vel[i * 3 + 1] = Math.abs(u) * sp * 0.5; sim.vel[i * 3 + 2] = sq * Math.sin(th) * sp;
      }
    }
    if (since < 0.4) return;

    // ---- task orbs: spawn, assign nearest free team, capture
    const interval = s.chapter === "cta" ? 0.8 : 1.2;
    if (t - sim.lastSpawn > interval) {
      sim.lastSpawn = t;
      const free = sim.orbs.findIndex((o) => !o.active);
      if (free >= 0) {
        const tile = sim.tiles[Math.floor(Math.random() * sim.tiles.length)];
        const o = sim.orbs[free];
        o.active = true; o.x = tile.x; o.z = tile.z; o.born = t; o.team = -1;
        let best = -1, bd = 1e9;
        sim.teams.forEach((tm, k) => {
          if (tm.orb >= 0) return;
          const d = Math.hypot(tm.c.x - o.x, tm.c.z - o.z);
          if (d < bd) { bd = d; best = k; }
        });
        if (best >= 0) { o.team = best; sim.teams[best].orb = free; }
      }
    }
    sim.orbs.forEach((o, k) => {
      const ov = arena.orbs[k];
      if (!o.active) { o.glow += (0 - o.glow) * ease(0.1, dt); ov.set(o.x, o.z, o.glow, 0); return; }
      o.glow += (1 - o.glow) * ease(0.08, dt);
      const tm = o.team >= 0 ? sim.teams[o.team] : null;
      const captured = tm && Math.hypot(tm.c.x - o.x, tm.c.z - o.z) < 0.55 && tm.c.y < 1.4;
      if (captured && tm) {
        o.active = false;
        tm.orb = -1;
        tm.boost = 1;
        addRipple(o.x, o.z, t, 1.2);
        arena.flash = 1;
        arena.flashCol.copy((U.uTeamCol.value as THREE.Color[])[o.team]);
        // beam from the orb to the core
        const b = sim.beams[sim.nextBeam];
        sim.nextBeam = (sim.nextBeam + 1) % N_BEAM;
        tmp.a.set(o.x, 0.55, o.z);
        tmp.b.copy(tmp.core).sub(tmp.a);
        b.mesh.position.copy(tmp.a);
        b.mesh.scale.set(1, tmp.b.length(), 1);
        b.mesh.quaternion.setFromUnitVectors(tmp.up, tmp.b.normalize());
        b.mat.color.copy(arena.flashCol).lerp(WHITE, 0.35);
        b.start = t;
        b.mesh.visible = true;
      } else if (t - o.born > 7) {
        o.active = false;
        if (tm) tm.orb = -1;
      }
      ov.set(o.x, o.z, o.glow, 0);
    });

    // ---- team centres
    const hoverTeam = s.hoverChip != null ? s.hoverChip % 5 : -1;
    const boosts = U.uTeamBoost.value as number[];
    sim.teams.forEach((tm, k) => {
      if (tm.orb >= 0) {
        const o = sim.orbs[tm.orb];
        tm.target.set(o.x, 0.75, o.z);
      } else {
        tm.target.set(Math.sin(t * 0.13 * tm.f + tm.ph) * 7.2, 2.3 + Math.sin(t * 0.31 + tm.ph) * 0.9, Math.cos(t * 0.11 * tm.f + tm.ph * 1.7) * 7.2);
      }
      tm.c.lerp(tm.target, 1 - Math.exp(-dt * (tm.orb >= 0 ? 1.2 : 0.6)));
      tm.boost *= Math.exp(-dt * 1.5);
      boosts[k] = Math.max(tm.boost, k === hoverTeam ? 0.8 : 0);
    });

    // ---- particles: spring toward team centre + orbiting offset + curl-ish wobble (no O(n^2))
    const P = sim.pos, V = sim.vel;
    const kSpring = 5.5, damp = 2.6;
    for (let i = 0; i < sim.n; i++) {
      const tm = sim.teams[sim.team[i] | 0];
      const a = sim.ph[i] + t * sim.w[i];
      const R = sim.rad[i] * (tm.orb >= 0 ? 0.75 : 1);
      const ca = Math.cos(a), sa = Math.sin(a);
      const ti = sim.tilt[i];
      const i3 = i * 3;
      const dx = tm.c.x + ca * R + Math.sin(t * 1.3 + i) * 0.12;
      const dy = tm.c.y + sa * R * ti * 0.6 + Math.sin(t * 1.7 + i * 0.37) * 0.1;
      const dz = tm.c.z + sa * R + Math.cos(t * 1.1 + i * 0.71) * 0.12;
      V[i3] += ((dx - P[i3]) * kSpring - V[i3] * damp) * dt;
      V[i3 + 1] += ((dy - P[i3 + 1]) * kSpring - V[i3 + 1] * damp) * dt;
      V[i3 + 2] += ((dz - P[i3 + 2]) * kSpring - V[i3 + 2] * damp) * dt;
      P[i3] += V[i3] * dt;
      P[i3 + 1] = Math.max(0.25, P[i3 + 1] + V[i3 + 1] * dt);
      P[i3 + 2] += V[i3 + 2] * dt;
    }
    sim.posAttr.needsUpdate = true;
    U.uTime.value = t;
    U.uVis.value = v;
    U.uScale.value = pointScale(state);

    // ---- orb sprites
    const os = sim.orbSprites;
    const op = os.pos.array as Float32Array, osz = os.size.array as Float32Array, oa = os.alpha.array as Float32Array, oc = os.col.array as Float32Array;
    sim.orbs.forEach((o, k) => {
      op[k * 3] = o.x; op[k * 3 + 1] = 0.6 + Math.sin(t * 3 + k) * 0.06; op[k * 3 + 2] = o.z;
      osz[k] = 0.9 + Math.sin(t * 5 + k) * 0.15;
      oa[k] = o.glow;
      const c = o.team >= 0 ? (U.uTeamCol.value as THREE.Color[])[o.team] : CYAN;
      oc[k * 3] = 0.6 + c.r * 0.4; oc[k * 3 + 1] = 0.6 + c.g * 0.4; oc[k * 3 + 2] = 0.6 + c.b * 0.4;
    });
    os.pos.needsUpdate = true; os.size.needsUpdate = true; os.alpha.needsUpdate = true; os.col.needsUpdate = true;
    os.uniforms.uVis.value = v;
    os.uniforms.uScale.value = U.uScale.value;

    // ---- beams
    for (const b of sim.beams) {
      if (!b.mesh.visible) continue;
      const age = (t - b.start) / 0.8;
      if (age >= 1) { b.mesh.visible = false; continue; }
      b.mat.opacity = (1 - age) * (1 - age) * v * 0.9;
      const w = 1 + age * 2;
      b.mesh.scale.x = w; b.mesh.scale.z = w;
    }
  });

  return (
    <group ref={group}>
      <points geometry={sim.geo} material={sim.mat} frustumCulled={false} renderOrder={7} />
      <points geometry={sim.orbSprites.g} material={sim.orbSprites.mat} frustumCulled={false} renderOrder={8} />
      {sim.beams.map((b, i) => (
        <primitive key={i} object={b.mesh} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ root */

export const ARENA_CHAPTERS = ["hero", "engines", "cta"];

/** The arena world. Lives in world space at the origin; fades in for hero / engines / cta. */
export default function Arena({ swarmCount }: { swarmCount: number }) {
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const s = useStore.getState();
    const t = state.clock.elapsedTime;
    if (s.booted && arena.bootT > 1e5) arena.bootT = t + 0.15;
    const on = ARENA_CHAPTERS.includes(s.chapter) && s.booted;
    // engines: dim to ~35% as the section scrolls toward platform so the DOM copy over the lower half stays clean
    const hand = s.chapter === "engines" ? Math.min(1, Math.max(0, (s.chapterProgress - 0.35) / 0.4)) : 0;
    const goal = on ? (runtime.layout.portrait ? 0.7 : s.chapter === "engines" ? 0.8 - 0.45 * hand : 1) : 0;
    arena.nearK += ((s.chapter === "engines" ? 0.6 + 0.4 * hand : 0) - arena.nearK) * ease(0.06, dt);
    arena.vis += (goal - arena.vis) * ease(on ? 0.04 : 0.09, dt);
    // core flash on boot
    const since = t - arena.bootT;
    if (since > 0.3 && since < 0.3 + dt * 1.5) { arena.flash = 1.4; arena.flashCol.set("#ffffff"); }
    arena.flash *= Math.exp(-dt * 2.2);
    // keep the hero copy readable: dim the arena on the left on desktop
    const wide = runtime.layout.wide;
    const dimGoal = !wide ? 0 : s.chapter === "hero" ? 0.8 : s.chapter === "engines" ? 0.45 : 0;
    arena.leftDim += (dimGoal - arena.leftDim) * ease(0.05, dt);
    arena.resX = state.size.width * state.gl.getPixelRatio();
    // hero chips highlight a floor sector
    arena.sectorAmt += ((s.hoverChip != null ? 1 : 0) - arena.sectorAmt) * ease(0.1, dt);
    if (s.hoverChip != null) arena.sector = s.hoverChip;
    runtime.flash = Math.max(runtime.flash, since > 0 && since < 1.5 ? (1.5 - since) * 0.6 : 0);
  });
  return (
    <group>
      <HexFloor />
      <Monoliths />
      <Core />
      <Swarms count={swarmCount} />
    </group>
  );
}
