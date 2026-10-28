"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { site } from "@/content/site";
import { runtime, type Layout } from "./runtime";
import { particleFrag, particleVert } from "./shaders/points";
import { Target, gauss, rng } from "./targets/util";
import { arenaDustTarget } from "./targets/arena";
import { clustersTarget, writeClusters, CLUSTERS, CLUSTER_TINTS } from "./targets/clusters";
import { coreTarget } from "./targets/core";
import { orbitTarget, writeOrbit } from "./targets/orbit";
import { devicesTarget } from "./targets/devices";
import { pricingTarget } from "./targets/pricing";
import { textTarget } from "./targets/textToPoints";
import { footerTextWidth, languageTextWidth, platformBandWidth } from "./layout";

type S = ReturnType<typeof useStore.getState>;

export const PALETTE = {
  dark: { a: new THREE.Color("#A98CFF"), b: new THREE.Color("#6FD0FF") },
  light: { a: new THREE.Color("#3C2E9E"), b: new THREE.Color("#1F6FD6") },
};

const INTRO_DUR = 2.4;

function keyFor(s: S, L: Layout): string {
  switch (s.chapter) {
    case "hero":
    case "engines":
    case "cta":
      // the arena world owns these chapters; the particles become floating dust motes
      return "arena";
    case "platform":
      return "platform";
    case "how":
      return "core";
    case "apps":
      return "orbit";
    case "download":
      return L.aspect < 0.9 ? "devices-grid" : "devices-row";
    case "languages":
      // the DOM greeting is the hero of this chapter; a particle copy of the word read as a duplicate
      return "arena";
    case "pricing":
      return `pricing-${s.pricingHover ?? 1}`;
    case "footer":
      return `footer-${Math.round(footerTextWidth(L) * 10)}`;
    default:
      return "arena";
  }
}

function buildTarget(key: string, n: number, s: S, L: Layout): Target {
  if (key === "arena") return arenaDustTarget(n);
  if (key === "platform") return clustersTarget(n);
  if (key === "core") return coreTarget(n);
  if (key === "orbit") return orbitTarget(n);
  if (key === "devices-grid") return devicesTarget(n, "grid");
  if (key === "devices-row") return devicesTarget(n, "row");
  if (key.startsWith("pricing-")) return pricingTarget(n, Number(key.split("-")[1]) || 0);
  if (key.startsWith("lang-")) {
    const list = site.languages.list;
    const item = list[Math.max(0, Math.min(list.length - 1, s.langIndex))];
    return textTarget(n, item?.greeting ?? "Hello", languageTextWidth(L), L.wide ? 2.8 : 1.8, { seed: 70 + s.langIndex });
  }
  if (key.startsWith("footer-")) return textTarget(n, "MIDEARTH", footerTextWidth(L), 2.0, { weight: "900", spacing: 10, seed: 90 });
  return arenaDustTarget(n);
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** Boot burst radius factor: blast out past the target (1.6x), then settle back to 1. */
const burst = (u: number) => (u < 0.3 ? 1.6 * easeOutCubic(u / 0.3) : 1 + 0.6 * (1 - easeInOutCubic((u - 0.3) / 0.7)));

export default function Particles({ max, active }: { max: number; active: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const data = useMemo(() => {
    const r = rng(99);
    const cur = new Float32Array(max * 3);
    const origin = new Float32Array(max * 3);
    const seed = new Float32Array(max);
    const size = new Float32Array(max);
    const bright = new Float32Array(max);
    const tintIdx = new Float32Array(max).fill(-1);
    const delay = new Float32Array(max);
    const speed = new Float32Array(max);
    for (let i = 0; i < max; i++) {
      const o = 0.03;
      origin[i * 3] = gauss(r) * o; origin[i * 3 + 1] = gauss(r) * o; origin[i * 3 + 2] = gauss(r) * o;
      cur[i * 3] = origin[i * 3]; cur[i * 3 + 1] = origin[i * 3 + 1]; cur[i * 3 + 2] = origin[i * 3 + 2];
      seed[i] = r();
      size[i] = r() < 0.04 ? 1.9 + r() * 0.7 : 0.55 + r() * 0.75;
      delay[i] = Math.pow(r(), 1.4) * 0.6;
      speed[i] = 0.7 + r() * 0.65;
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(cur, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const brAttr = new THREE.BufferAttribute(bright, 1);
    brAttr.setUsage(THREE.DynamicDrawUsage);
    const tintAttr = new THREE.BufferAttribute(tintIdx, 1);
    geo.setAttribute("position", posAttr);
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aBright", brAttr);
    geo.setAttribute("aTintIdx", tintAttr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    return {
      cur, origin, bright, delay, speed, seed, geo, posAttr, brAttr, tintAttr,
      scratch: new Float32Array(max * 3),
      bScratch: new Float32Array(max),
      cache: new Map<string, Target>(),
    };
  }, [max]);

  const mat = useMemo(() => {
    const tints = CLUSTER_TINTS.map((c) => new THREE.Color(c));
    return new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.024 },
        uScale: { value: 1000 },
        uOpacity: { value: 0 },
        uTintAmt: { value: 0 },
        uFlash: { value: 0 },
        uLight: { value: 0 },
        uGroupTint: { value: 0 },
        uDepthFade: { value: 0 },
        uColA: { value: PALETTE.dark.a.clone() },
        uColB: { value: PALETTE.dark.b.clone() },
        uTint: { value: new THREE.Color("#A98CFF") },
        uPal0: { value: tints[0] },
        uPal1: { value: tints[1] },
        uPal2: { value: tints[2] },
        uPal3: { value: tints[3] },
        uPal4: { value: tints[4] },
        uPal5: { value: tints[5] },
      },
    });
  }, []);

  useEffect(() => () => { data.geo.dispose(); }, [data]);
  useEffect(() => () => { mat.dispose(); }, [mat]);

  useEffect(() => {
    data.geo.setDrawRange(0, active);
    runtime.activeCount = active;
  }, [active, data]);

  const st = useRef({
    key: "",
    target: null as Target | null,
    switchT: -100,
    intro: 0 as 0 | 1 | 2,
    introT: 0,
    theme: "" as string,
    act: new Array(CLUSTERS).fill(0) as number[],
    gf: new Float32Array(256),
    ray: new THREE.Raycaster(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    normal: new THREE.Vector3(0, 0, 1),
    v: new THREE.Vector3(),
    v2: new THREE.Vector2(),
    hit: new THREE.Vector3(),
  });

  useFrame((state, dtRaw) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const dt = Math.min(dtRaw, 0.2);
    const t = state.clock.elapsedTime;
    const s = useStore.getState();
    const L = runtime.layout;
    const S = st.current;
    const n = Math.min(active, max);
    const u = mat.uniforms;

    // ---- theme
    if (S.theme !== s.theme) {
      S.theme = s.theme;
      const light = s.theme === "light";
      const p = light ? PALETTE.light : PALETTE.dark;
      u.uColA.value.copy(p.a);
      u.uColB.value.copy(p.b);
      u.uLight.value = light ? 1 : 0;
      mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      mat.needsUpdate = true;
    }

    // ---- target selection
    const key = keyFor(s, L);
    if (key !== S.key) {
      let tg = data.cache.get(key);
      if (!tg) {
        tg = buildTarget(key, max, s, L);
        if (data.cache.size > 24) data.cache.clear();
        data.cache.set(key, tg);
      }
      S.key = key;
      S.target = tg;
      if (S.intro === 2) S.switchT = t;
      if (key === "platform") {
        const ti = data.tintAttr.array as Float32Array;
        for (let i = 0; i < max; i++) ti[i] = tg.group[i] < CLUSTERS ? tg.group[i] : -1;
        data.tintAttr.needsUpdate = true;
      }
    }
    const tg = S.target as Target;
    runtime.shape = key;

    // ---- dynamic targets
    let tgt = tg.pos;
    let bsrc = tg.bright;
    const ke = (x: number) => 1 - Math.pow(1 - x, dt * 60);
    const kk = ke(0.06);
    if (key === "platform") {
      for (let c = 0; c < CLUSTERS; c++) S.act[c] += ((c === s.platformIndex ? 1 : 0) - S.act[c]) * ke(0.05);
      writeClusters(tg, data.scratch, data.bScratch, n, platformBandWidth(L), S.act, t);
      tgt = data.scratch;
      bsrc = data.bScratch;
    } else if (key === "orbit") {
      writeOrbit(tg, data.scratch, n, t);
      tgt = data.scratch;
    }
    u.uGroupTint.value += ((key === "platform" ? 1 : 0) - u.uGroupTint.value) * ke(0.04);

    // ---- brightness modifiers per group
    const gf = S.gf;
    gf.fill(1);
    let gMul = 1;
    if (key.startsWith("devices")) {
      // dim backdrop: never fight the DOM device cards
      for (let g = 0; g < 4; g++) gf[g] = g === s.deviceIndex ? 0.7 : 0.25;
    } else if (key === "orbit") {
      gMul = 0.6; // frame the DOM orbit visual, never compete with it
    } else if (key.startsWith("lang")) {
      gMul = 0.75; // backdrop behind the DOM greeting
    }


    // ---- intro
    if (S.intro === 0 && s.booted) { S.intro = 1; S.introT = t; u.uOpacity.value = 1; }
    const opGoal = S.intro === 0 ? 0 : 1;
    u.uOpacity.value += (opGoal - u.uOpacity.value) * ke(0.08);
    u.uFlash.value = S.intro === 1 ? 1.5 * Math.exp(-(t - S.introT) * 2.6) : 0;
    runtime.flash = u.uFlash.value;
    runtime.introP = S.intro === 0 ? 0 : S.intro === 1 ? Math.min(1, (t - S.introT) / INTRO_DUR) : 1;

    const cur = data.cur, bright = data.bright, delay = data.delay, speed = data.speed, seed = data.seed;
    const kb = ke(0.08);
    const groups = tg.group;

    if (S.intro === 1) {
      const el = t - S.introT;
      const origin = data.origin;
      for (let i = 0; i < n; i++) {
        const p = Math.min(1, Math.max(0, (el - delay[i] * 0.4) / (INTRO_DUR - 0.4)));
        const e = p <= 0 ? 0 : burst(p);
        const i3 = i * 3;
        cur[i3] = origin[i3] + (tgt[i3] - origin[i3]) * e;
        cur[i3 + 1] = origin[i3 + 1] + (tgt[i3 + 1] - origin[i3 + 1]) * e;
        cur[i3 + 2] = origin[i3 + 2] + (tgt[i3 + 2] - origin[i3 + 2]) * e;
        const bt = bsrc[i] * gf[groups[i]] * gMul;
        bright[i] += (bt - bright[i]) * kb;
      }
      if (el > INTRO_DUR + 0.1) { S.intro = 2; S.switchT = -100; }
    } else if (S.intro === 2) {
      const el = t - S.switchT;
      const swirl = 3.4 * dt;
      const nAmt = 0.9 * dt;
      for (let i = 0; i < n; i++) {
        const bt = bsrc[i] * gf[groups[i]] * gMul;
        bright[i] += (bt - bright[i]) * kb;
        if (el < delay[i]) continue;
        const i3 = i * 3;
        let dx = cur[i3] - tgt[i3], dy = cur[i3 + 1] - tgt[i3 + 1], dz = cur[i3 + 2] - tgt[i3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        const k = Math.min(1, kk * speed[i]);
        if (d2 > 0.0025) {
          // swirl: spiral the offset around the vertical axis + curl-like noise, both scaled by distance
          const dist = Math.sqrt(d2);
          const w = Math.min(1, dist * 0.5);
          const a = swirl * w * (0.6 + seed[i] * 0.8);
          const ca = Math.cos(a), sa = Math.sin(a);
          const rx = dx * ca - dz * sa, rz = dx * sa + dz * ca;
          const sd = seed[i] * 6.283;
          const na = dist * nAmt;
          dx = rx + Math.sin(cur[i3 + 1] * 1.3 + t * 1.1 + sd) * na;
          dy = dy + Math.sin(cur[i3 + 2] * 1.3 + t * 0.9 + sd) * na;
          dz = rz + Math.sin(cur[i3] * 1.3 + t * 1.2 + sd) * na;
        }
        const f = 1 - k;
        cur[i3] = tgt[i3] + dx * f;
        cur[i3 + 1] = tgt[i3 + 1] + dy * f;
        cur[i3 + 2] = tgt[i3 + 2] + dz * f;
      }
    }

    // ---- mouse scatter (text chapters)
    const m = runtime.mouse;
    if (S.intro === 2 && m.active && (key.startsWith("footer") || key.startsWith("lang"))) {
      pts.updateMatrixWorld();
      S.v2.set(m.x, m.y);
      S.ray.setFromCamera(S.v2, state.camera);
      pts.getWorldPosition(S.v);
      S.plane.set(S.normal, -S.v.z);
      if (S.ray.ray.intersectPlane(S.plane, S.hit)) {
        pts.worldToLocal(S.hit);
        const mx = S.hit.x, my = S.hit.y;
        const R = key.startsWith("footer") ? 0.9 : 0.75;
        const R2 = R * R;
        const push = 0.22 * dt * 60;
        for (let i = 0; i < n; i++) {
          const i3 = i * 3;
          const dx = cur[i3] - mx, dy = cur[i3 + 1] - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) * (1 - d / R) * push;
            cur[i3] += (dx / d) * f;
            cur[i3 + 1] += (dy / d) * f;
            cur[i3 + 2] += f * (speed[i] - 1) * 1.5;
          }
        }
      }
    }

    data.posAttr.clearUpdateRanges();
    data.posAttr.addUpdateRange(0, n * 3);
    data.posAttr.needsUpdate = true;
    data.brAttr.clearUpdateRanges();
    data.brAttr.addUpdateRange(0, n);
    data.brAttr.needsUpdate = true;

    // ---- uniforms
    u.uTime.value = t;
    const cam = state.camera as THREE.PerspectiveCamera;
    const dpr = state.gl.getPixelRatio();
    u.uScale.value = (state.size.height * dpr * 0.5) / Math.tan(THREE.MathUtils.degToRad((cam.fov || 45) / 2));
    u.uSize.value = 0.026 * Math.pow(12000 / Math.max(1000, n), 0.3);

  });

  return <points ref={pointsRef} geometry={data.geo} material={mat} frustumCulled={false} />;
}
