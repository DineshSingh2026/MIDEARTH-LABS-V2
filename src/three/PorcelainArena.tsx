"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useStore } from "@/lib/store";
import { site, engineColor } from "@/content/site";
import { ease } from "./util3d";
import { CORE_Y, FLOOR_R, HEX_S, hexCentres, MONO_R } from "./targets/arena";
import { rng } from "./targets/util";
import { arena } from "./arenaState";

/* =====================================================================================
 * LIGHT THEME: "PORCELAIN". A lit clay / product render of the same arena:
 * matte porcelain hex terrain, frosted-glass engine sculptures, a refractive iridescent
 * crystal core, soft image-based lighting. Colour appears only on events (pastel spills).
 * ===================================================================================== */

const ENGINES = site.engineRail.engines;
const N_MONO = ENGINES.length;
const monoPos = ENGINES.map((_, i) => {
  const a = (i / N_MONO) * Math.PI * 2 + Math.PI / N_MONO;
  return new THREE.Vector3(Math.cos(a) * MONO_R, 0, Math.sin(a) * MONO_R);
});
const monoH = ENGINES.map((_, i) => 2.3 + ((i * 7) % 5) * 0.32);
const monoCol = ENGINES.map((e, i) => {
  if (e.slug === "grok") return new THREE.Color("#14173A");
  const hex = engineColor[e.slug];
  if (hex) return new THREE.Color(hex);
  return new THREE.Color("#6B3FE8").lerp(new THREE.Color("#4F8BFF"), (i % 5) / 9);
});

/** Light-only visibility: the arena fades fully out through the engines -> platform hand-off. */
function porcelainVis() {
  const s = useStore.getState();
  if (s.chapter === "engines") return arena.vis * Math.max(0, 0.75 - s.chapterProgress * 1.1);
  return arena.vis;
}

/* ------------------------------------------------------------------ environment + lights */
export function PorcelainEnv() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    const prev = scene.environment;
    scene.environment = env;
    return () => {
      scene.environment = prev;
      env.dispose();
      pmrem.dispose();
      room.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      });
    };
  }, [gl, scene]);
  return (
    <>
      <hemisphereLight args={["#FFFFFF", "#E7E1FF", 1.0]} />
      <directionalLight color="#FFF8F2" intensity={1.2} position={[-7, 11, 6]} />
      <directionalLight color="#EAF3FF" intensity={0.4} position={[9, 4, -3]} />
    </>
  );
}

/* ------------------------------------------------------------------ porcelain hex terrain */
const floorVert = /* glsl */ `
attribute vec4 aTile; // radial dist, sector, seed, height
varying vec3 vLocal;
varying vec3 vWorld;
varying vec4 vTile;
varying vec3 vN;
varying float vTop;
void main() {
  vLocal = position;
  vTile = aTile;
  vN = normal;
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
uniform float uLeftDim;
uniform float uResX;
uniform float uSector;
uniform float uSectorAmt;
uniform vec3 uP1;
uniform vec3 uP2;
uniform vec3 uP3;
uniform vec3 uRim;
uniform vec4 uRip[6];
uniform vec4 uOrb[3];
uniform vec3 uMono[${N_MONO}];   // x, z, flare
uniform vec3 uMonoCol[${N_MONO}];
varying vec3 vLocal;
varying vec3 vWorld;
varying vec4 vTile;
varying vec3 vN;
varying float vTop;

float hexd(vec2 p) {
  p = abs(p);
  return max(p.x, dot(p, vec2(0.5, 0.8660254))) / 0.8660254;
}
vec3 pastel(float k) {
  // violet -> cyan -> pink, like light spilling through glass
  vec3 a = mix(uP1, uP2, smoothstep(0.0, 0.5, k));
  return mix(a, uP3, smoothstep(0.5, 1.0, k));
}

void main() {
  float r = vTile.x;
  float seed = vTile.z;
  vec3 n = normalize(vN);
  float hd = hexd(vLocal.xz);
  float since = uTime - uBoot;
  float bootR = since * 7.0;
  float lit = since < 0.0 ? 0.0 : smoothstep(bootR + 0.5, bootR - 2.5, r);

  // --- soft studio lighting (hemi + warm key from upper-left + cool fill)
  vec3 L1 = normalize(vec3(-0.55, 0.85, 0.35));
  vec3 L2 = normalize(vec3(0.75, 0.35, -0.25));
  vec3 hemi = mix(vec3(0.80, 0.75, 1.0), vec3(1.0), n.y * 0.5 + 0.5);
  vec3 albedo = vTop > 0.5 ? vec3(1.0) : vec3(0.86, 0.83, 0.95);
  vec3 col = albedo * (hemi * 0.64 + vec3(1.0, 0.94, 0.89) * max(dot(n, L1), 0.0) * 0.4 + vec3(0.83, 0.9, 1.0) * max(dot(n, L2), 0.0) * 0.12);
  if (vTop > 0.5) {
    // bevel highlight + hairline rim + soft drop at the very edge
    col += vec3(0.05) * smoothstep(0.76, 0.9, hd) * (1.0 - smoothstep(0.9, 0.97, hd));
    col = mix(col, uRim, smoothstep(0.95, 0.985, hd) * 0.15);
    col *= mix(1.0, 0.9, smoothstep(0.975, 1.0, hd));
  } else {
    float y = vLocal.y + 0.5;
    col *= mix(0.8, 1.0, smoothstep(0.0, 0.85, y)); // contact occlusion at the tile base
  }
  // soft blob shadow beneath the floating core
  col *= 1.0 - 0.1 * exp(-r * r * 0.35);

  // --- colour only on events
  float amt = 0.0;
  vec3 tint = uP1;
  // core caustic: violet -> cyan, gently breathing
  float caus = exp(-r * r * 0.22) * (0.42 + 0.08 * sin(uTime * 1.3 - r * 2.0));
  amt += caus; tint = pastel(clamp(r / 3.2, 0.0, 0.6));
  // capture ripples: a pastel spill that spreads and fades over ~1.6s
  for (int i = 0; i < 6; i++) {
    float age = uTime - uRip[i].z;
    if (age < 0.0 || age > 1.8) continue;
    vec2 dv = vWorld.xz - uRip[i].xy;
    float d = length(dv);
    float f = (1.0 - age / 1.8);
    float w = (exp(-pow((d - age * 3.0) * 0.8, 2.0)) * 0.9 + exp(-d * d * 0.3) * 0.6) * f * f * uRip[i].w;
    if (w > amt * 0.5) tint = mix(tint, pastel(fract(d * 0.18 + age * 0.4 + atan(dv.y, dv.x) * 0.16)), clamp(w / (amt + w + 1e-3), 0.0, 1.0));
    amt += w;
  }
  // heartbeat: a very subtle pastel shimmer
  float hb = mod(uTime, 4.5) * 5.0;
  float beat = exp(-pow((r - hb) * 0.9, 2.0)) * 0.1 * (1.0 - smoothstep(6.0, 14.0, hb));
  amt += beat;
  // task orbs: soft pool under each orb
  for (int i = 0; i < 3; i++) {
    float d = length(vWorld.xz - uOrb[i].xy);
    float w = uOrb[i].z * exp(-d * d * 1.1) * 0.45;
    tint = mix(tint, uP2, clamp(w * 1.5, 0.0, 1.0) * step(amt, 0.6));
    amt += w;
  }
  // monolith light pools in the engine colour
  vec3 poolCol = vec3(0.0);
  float pool = 0.0;
  for (int i = 0; i < ${N_MONO}; i++) {
    float d = length(vWorld.xz - uMono[i].xy);
    float w = exp(-d * d * 1.6) * (0.22 + uMono[i].z * 0.5);
    poolCol += uMonoCol[i] * w;
    pool += w;
  }
  // hero chip: pastel sector highlight
  amt += uSectorAmt * 0.3 * (1.0 - step(0.5, abs(vTile.y - uSector)));
  float topK = vTop > 0.5 ? 1.0 : 0.45;
  col = mix(col, col * 0.35 + tint * 0.75, clamp(amt, 0.0, 0.75) * topK);
  col = mix(col, poolCol / max(pool, 1e-3), clamp(pool, 0.0, 0.45) * topK);

  // --- composition: fog to the ground, calm left side, no near-camera clutter
  float fog = 1.0 - smoothstep(6.5, 13.5, r);
  float sx = gl_FragCoord.x / uResX;
  float dim = mix(1.0, smoothstep(0.18, 0.6, sx), uLeftDim);
  float near = smoothstep(4.0, 9.0, distance(cameraPosition, vWorld));
  gl_FragColor = vec4(col, fog * near * dim * lit * uVis);
}
`;

const baseFrag = /* glsl */ `
uniform float uVis;
uniform float uLeftDim;
uniform float uResX;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0 * ${FLOOR_R.toFixed(1)};
  float fog = 1.0 - smoothstep(6.0, 13.0, r);
  float sx = gl_FragCoord.x / uResX;
  float dim = mix(1.0, smoothstep(0.18, 0.6, sx), uLeftDim);
  // the crevices between tiles: a soft violet-grey "clay" shadow
  gl_FragColor = vec4(vec3(0.76, 0.73, 0.92), 0.7 * fog * dim * uVis);
}
`;
const baseVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

function PorcelainFloor() {
  const parts = useMemo(() => {
    const r = rng(4242);
    const tiles = hexCentres(FLOOR_R);
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
    const n = tiles.length;
    const aTile = new Float32Array(n * 4);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const uniforms = {
      uTime: { value: 0 }, uVis: { value: 0 }, uBoot: { value: 1e6 }, uLeftDim: { value: 0 }, uResX: { value: 1 },
      uSector: { value: 0 }, uSectorAmt: { value: 0 },
      uP1: { value: new THREE.Color("#C9B8FF") }, uP2: { value: new THREE.Color("#A8E6FF") }, uP3: { value: new THREE.Color("#FFC4EC") },
      uRim: { value: new THREE.Color("#CFC6F2") },
      uRip: { value: arena.rip }, uOrb: { value: arena.orbs },
      uMono: { value: monoPos.map((v) => new THREE.Vector3(v.x * 0.97, v.z * 0.97, 0)) },
      uMonoCol: { value: monoCol.map((c) => c.clone().lerp(new THREE.Color("#ffffff"), 0.35)) },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: floorVert, fragmentShader: floorFrag, uniforms, transparent: true, depthWrite: true });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    tiles.forEach((tl, i) => {
      const d = Math.hypot(tl.x, tl.z);
      // gentle low-frequency relief: a soft porcelain terrain
      const relief = 0.5 + 0.5 * Math.sin(tl.x * 0.31 + 1.3) * Math.cos(tl.z * 0.27 - 0.4);
      const h = 0.12 + relief * 0.12 + r() * 0.02;
      p.set(tl.x, h / 2 - 0.02, tl.z);
      s.set(HEX_S * 0.95, h, HEX_S * 0.95);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      const ang = Math.atan2(tl.z, tl.x) + Math.PI;
      aTile[i * 4] = d;
      aTile[i * 4 + 1] = Math.min(5, Math.floor((ang / (Math.PI * 2)) * 6));
      aTile[i * 4 + 2] = r();
      aTile[i * 4 + 3] = h;
    });
    geo.setAttribute("aTile", new THREE.InstancedBufferAttribute(aTile, 4));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = -2;
    const baseGeo = new THREE.PlaneGeometry(FLOOR_R * 2, FLOOR_R * 2);
    baseGeo.rotateX(-Math.PI / 2);
    const baseMat = new THREE.ShaderMaterial({
      vertexShader: baseVert, fragmentShader: baseFrag, transparent: true, depthWrite: false,
      uniforms: { uVis: { value: 0 }, uLeftDim: { value: 0 }, uResX: { value: 1 } },
    });
    return { geo, mat, mesh, baseGeo, baseMat };
  }, []);
  useEffect(() => () => { parts.geo.dispose(); parts.mat.dispose(); parts.mesh.dispose(); parts.baseGeo.dispose(); parts.baseMat.dispose(); }, [parts]);

  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const s = useStore.getState();
    const u = parts.mat.uniforms;
    const v = porcelainVis();
    u.uTime.value = state.clock.elapsedTime;
    u.uVis.value = v;
    u.uBoot.value = arena.bootT;
    u.uLeftDim.value = arena.leftDim;
    u.uResX.value = arena.resX;
    u.uSector.value = arena.sector;
    u.uSectorAmt.value = arena.sectorAmt;
    const mono = u.uMono.value as THREE.Vector3[];
    const hovered = s.engineColor ? s.engineColor.toLowerCase() : null;
    for (let i = 0; i < N_MONO; i++) {
      const match = hovered && (engineColor[ENGINES[i].slug] ?? "").toLowerCase() === hovered;
      mono[i].z += ((match ? 1 : s.chapter === "cta" ? 0.4 : 0) - mono[i].z) * 0.1;
    }
    const b = parts.baseMat.uniforms;
    b.uVis.value = v;
    b.uLeftDim.value = arena.leftDim;
    b.uResX.value = arena.resX;
    if (group.current) group.current.visible = v > 0.01;
  });
  return (
    <group ref={group}>
      <mesh geometry={parts.baseGeo} material={parts.baseMat} position={[0, 0.0, 0]} renderOrder={-3} />
      <primitive object={parts.mesh} />
    </group>
  );
}

/* ------------------------------------------------------------------ frosted-glass engine sculptures */
function PorcelainMonoliths() {
  const parts = useMemo(() => {
    const items = monoPos.map((mp, i) => {
      const h = monoH[i] * 0.92;
      // frosted porcelain-glass slab (standard material: transmission is reserved for the core)
      const body = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#E4DDFA").lerp(monoCol[i], 0.1), roughness: 0.22, metalness: 0,
        envMapIntensity: 1.5, transparent: true, opacity: 0,
      });
      const strip = new THREE.MeshBasicMaterial({ color: monoCol[i], transparent: true, opacity: 0, toneMapped: false });
      const cap = new THREE.MeshStandardMaterial({ color: monoCol[i], emissive: monoCol[i], emissiveIntensity: 0.35, roughness: 0.3, transparent: true, opacity: 0 });
      return { h, body, strip, cap, rotY: Math.atan2(-mp.x, -mp.z), flare: 0 };
    });
    const bodyGeo = new THREE.BoxGeometry(0.62, 1, 0.2);
    const stripGeo = new THREE.BoxGeometry(0.07, 1, 0.215);
    const capGeo = new THREE.BoxGeometry(0.64, 0.07, 0.22);
    return { items, bodyGeo, stripGeo, capGeo };
  }, []);
  useEffect(() => () => {
    parts.items.forEach((it) => { it.body.dispose(); it.strip.dispose(); it.cap.dispose(); });
    parts.bodyGeo.dispose(); parts.stripGeo.dispose(); parts.capGeo.dispose();
  }, [parts]);

  const group = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const s = useStore.getState();
    const t = state.clock.elapsedTime;
    const v = porcelainVis();
    if (group.current) group.current.visible = v > 0.01;
    if (v <= 0.01) return;
    const since = t - arena.bootT;
    const hovered = s.engineColor ? s.engineColor.toLowerCase() : null;
    const cam = state.camera.position;
    parts.items.forEach((it, i) => {
      const match = hovered && (engineColor[ENGINES[i].slug] ?? "").toLowerCase() === hovered;
      it.flare += ((match ? 1 : s.chapter === "cta" ? 0.45 : 0) - it.flare) * ease(match ? 0.15 : 0.05, dt);
      const litK = since < 0 ? 0 : Math.min(1, Math.max(0, (since - 0.7 - i * 0.11) / 0.35));
      tmp.set(monoPos[i].x, it.h / 2, monoPos[i].z);
      const near = THREE.MathUtils.smoothstep(tmp.distanceTo(cam), 12, 17);
      const o = v * near;
      // keep the left side calm behind the hero copy
      tmp.project(state.camera);
      const sx = tmp.x * 0.5 + 0.5;
      const dim = 1 - arena.leftDim + arena.leftDim * THREE.MathUtils.smoothstep(sx, 0.2, 0.6);
      const oo = o * dim;
      it.body.opacity = oo * 0.94;
      it.strip.opacity = oo * litK * (0.85 + it.flare * 0.15);
      it.cap.opacity = oo * litK;
      it.cap.emissiveIntensity = 0.35 + it.flare * 0.9;
    });
  });

  return (
    <group ref={group}>
      {parts.items.map((it, i) => (
        <group key={i} position={[monoPos[i].x, 0, monoPos[i].z]} rotation={[0, it.rotY, 0]}>
          <mesh geometry={parts.bodyGeo} material={it.body} scale={[1, it.h, 1]} position={[0, it.h / 2, 0]} />
          <mesh geometry={parts.stripGeo} material={it.strip} scale={[1, it.h * 0.86, 1]} position={[0, it.h / 2, 0]} />
          <mesh geometry={parts.capGeo} material={it.cap} position={[0, it.h + 0.035, 0]} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ refractive iridescent crystal */
function PorcelainCore() {
  const crystal = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const group = useRef<THREE.Group>(null);
  const parts = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.95, 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: "#F1ECFF", transmission: 1, thickness: 1.6, roughness: 0.05, ior: 1.5,
      iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 800],
      attenuationColor: new THREE.Color("#B9A6FF"), attenuationDistance: 0.7,
      envMapIntensity: 2.0, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 1,
      transparent: true, opacity: 0,
    });
    const edges = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: "#5B2EE0", transparent: true, opacity: 0 });
    const ringGeos = [1.45, 1.85, 2.3].map((R) => new THREE.TorusGeometry(R, 0.006, 6, 220));
    const ringMats = ["#5B2EE0", "#1F6FD6", "#8B6CF2"].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0 }));
    return { geo, mat, edges, edgeMat, ringGeos, ringMats };
  }, []);
  useEffect(() => () => {
    parts.geo.dispose(); parts.mat.dispose(); parts.edges.dispose(); parts.edgeMat.dispose();
    parts.ringGeos.forEach((g) => g.dispose()); parts.ringMats.forEach((m) => m.dispose());
  }, [parts]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const t = state.clock.elapsedTime;
    const s = useStore.getState();
    const v = porcelainVis();
    if (group.current) group.current.visible = v > 0.01;
    const cta = s.chapter === "cta";
    parts.mat.opacity = v;
    parts.edgeMat.opacity = v * 0.6;
    // a capture tints the glass with the winning team's colour for a moment
    parts.mat.attenuationColor.setRGB(0.73, 0.65, 1.0).lerp(arena.flashCol, Math.min(0.6, arena.flash * 0.6));
    parts.ringMats.forEach((m, i) => { m.opacity = v * (0.5 + 0.15 * Math.sin(t * 1.3 + i)); });
    if (crystal.current) {
      crystal.current.rotation.y += dt * (cta ? 0.5 : 0.25);
      crystal.current.rotation.x = 0.35 + Math.sin(t * 0.3) * 0.12;
      crystal.current.position.y = CORE_Y + Math.sin(t * 0.8) * 0.08;
    }
    rings.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.x = Math.PI / 2 + Math.sin(t * 0.21 + i * 2) * (0.35 + i * 0.12);
      r.rotation.y += dt * (0.25 - i * 0.17);
      r.position.y = CORE_Y + Math.sin(t * 0.8) * 0.08;
    });
  });

  return (
    <group ref={group}>
      <mesh ref={crystal} geometry={parts.geo} material={parts.mat} position={[0, CORE_Y, 0]}>
        <lineSegments geometry={parts.edges} material={parts.edgeMat} scale={1.003} />
      </mesh>
      {parts.ringGeos.map((g, i) => (
        <mesh key={i} ref={(el) => { rings.current[i] = el; }} geometry={g} material={parts.ringMats[i]} position={[0, CORE_Y, 0]} />
      ))}
    </group>
  );
}

/** The light-theme arena (the swarms, orbs and shared state live in Arena.tsx). */
export default function PorcelainArena() {
  return (
    <group>
      <PorcelainEnv />
      <PorcelainFloor />
      <PorcelainMonoliths />
      <PorcelainCore />
    </group>
  );
}
