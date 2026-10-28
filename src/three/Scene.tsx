"use client";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Vignette, Noise, N8AO } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect } from "postprocessing";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { runtime } from "./runtime";
import { chapterLayout } from "./layout";
import Particles from "./Particles";
import EventRiver from "./EventRiver";
import Starfield from "./Starfield";
import Arena from "./Arena";

const CAM_DIST = 8;
const FOV = 45;
const MAX_TILT = THREE.MathUtils.degToRad(8);

function particleBudget(w: number) {
  if (w < 768) return 3500;
  if (w < 1400) return 8000;
  return 12000;
}

/** Groups, chapter layout, camera rig and mouse parallax. */
function World({ max, active }: { max: number; active: number }) {
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const rig = useMemo(
    () => ({ look: new THREE.Vector3(), camGoal: new THREE.Vector3(0, 0, CAM_DIST), posGoal: new THREE.Vector3(), spinSpeed: 0.09, mx: 0, my: 0, scale: 1, dolly: 0, chapter: "", orbit: 0, vox: 0, voy: 0, arenaAmt: 0, fov: FOV }),
    []
  );

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.2);
    const { width: w, height: h } = state.size;
    const aspect = w / Math.max(1, h);
    const visH = 2 * CAM_DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const L = runtime.layout;
    L.w = w; L.h = h; L.aspect = aspect; L.visH = visH; L.visW = visH * aspect;
    L.wide = w >= 1024 && aspect >= 1.2;
    L.portrait = aspect < 0.9;

    const s = useStore.getState();
    const lay = chapterLayout(s.chapter, L, s.pricingHover ?? 1);
    const k = 1 - Math.pow(1 - 0.045, dt * 60);
    const kc = 1 - Math.pow(1 - 0.035, dt * 60);

    if (root.current) {
      rig.posGoal.set(lay.pos[0], lay.pos[1], lay.pos[2]);
      root.current.position.lerp(rig.posGoal, k);
      rig.scale += (lay.scale - rig.scale) * k;
      root.current.scale.setScalar(rig.scale);
    }
    if (spin.current) {
      const sp = spin.current;
      if (lay.spin > 0) {
        rig.spinSpeed += (lay.spin - rig.spinSpeed) * k;
        sp.rotation.y += rig.spinSpeed * dt;
      } else {
        rig.spinSpeed *= 1 - k;
        const goal = Math.round(sp.rotation.y / (Math.PI * 2)) * Math.PI * 2;
        sp.rotation.y += (goal - sp.rotation.y) * k + rig.spinSpeed * dt;
      }
    }
    if (tilt.current) {
      const m = runtime.mouse;
      const textish = s.chapter === "languages" || s.chapter === "footer" || s.chapter === "download" || s.chapter === "platform";
      const amt = lay.arena ? 0 : textish ? 0.4 : 1;
      rig.mx += ((m.active ? m.x : 0) - rig.mx) * k;
      rig.my += ((m.active ? m.y : 0) - rig.my) * k;
      tilt.current.rotation.x += (lay.tiltX - rig.my * MAX_TILT * amt - tilt.current.rotation.x) * k;
      tilt.current.rotation.y += (rig.mx * MAX_TILT * amt - tilt.current.rotation.y) * k;
    }
    // camera
    const cam = state.camera;
    // per-chapter dolly: pull back on every chapter change, then glide in; plus a slow idle drift
    if (rig.chapter !== s.chapter) {
      if (rig.chapter) rig.dolly = s.chapter === "how" ? 1.6 : 1.0;
      rig.chapter = s.chapter;
    }
    rig.dolly *= Math.pow(0.982, dt * 60);
    const t = state.clock.elapsedTime;
    const A = lay.arena;
    let lx = lay.look[0], ly = lay.look[1], lz = lay.look[2];
    // light "porcelain" arena: longer lens + slightly higher camera (product-render feel); dark is untouched
    const porcelain = !!A && s.theme === "light";
    rig.fov += ((porcelain ? 33 : FOV) - rig.fov) * kc;
    const pcam = cam as THREE.PerspectiveCamera;
    if (Math.abs(pcam.fov - rig.fov) > 0.01) { pcam.fov = rig.fov; pcam.updateProjectionMatrix(); }
    if (A) {
      // slow cinematic orbit + mouse parallax (yaw + height)
      rig.orbit += A.speed * dt;
      const a = rig.orbit + rig.mx * 0.14;
      // keep the framing when the lens narrows
      const lens = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) / Math.tan(THREE.MathUtils.degToRad(rig.fov / 2));
      const R = (A.R + rig.dolly * 2.5) * lens;
      const H = A.H * lens * (porcelain ? (s.chapter === "cta" ? 1.3 : 1.22) : 1);
      rig.camGoal.set(Math.sin(a) * R, H - rig.my * 0.7 + Math.sin(t * 0.13) * 0.25, Math.cos(a) * R);
      lx = A.look[0]; ly = A.look[1]; lz = A.look[2];
    } else {
      rig.camGoal.set(
        lay.cam[0] + Math.sin(t * 0.11) * 0.22,
        lay.cam[1] + Math.cos(t * 0.087) * 0.13,
        lay.cam[2] + rig.dolly + Math.sin(t * 0.07) * 0.18
      );
    }
    cam.position.lerp(rig.camGoal, kc);
    rig.look.x += (lx - rig.look.x) * kc;
    rig.look.y += (ly - rig.look.y) * kc;
    rig.look.z += (lz - rig.look.z) * kc;
    cam.lookAt(rig.look);
    // frame the arena core off-centre (desktop hero) by shifting the projection window
    const pc = cam as THREE.PerspectiveCamera;
    rig.vox += ((A ? A.vo[0] : 0) - rig.vox) * kc;
    rig.voy += ((A ? A.vo[1] : 0) - rig.voy) * kc;
    if (Math.abs(rig.vox) > 0.0005 || Math.abs(rig.voy) > 0.0005) {
      pc.setViewOffset(w, h, -rig.vox * w, rig.voy * h, w, h);
    } else if (pc.view && pc.view.enabled) {
      pc.clearViewOffset();
    }
  });

  const riverCount = Math.round(1800 * Math.min(1, max / 12000) + 300);

  return (
    <group ref={root}>
      <group ref={tilt}>
        <group ref={spin}>
          <Particles max={max} active={active} />
        </group>
      </group>
      <EventRiver count={riverCount} />
    </group>
  );
}

/** Wraps the world + the arena (the arena lives in world space, outside the chapter-layout groups). */
function Worlds({ max, active }: { max: number; active: number }) {
  // fixed per device class (changing it would rebuild the swarm sim)
  const swarm = max >= 12000 ? 3000 : max >= 8000 ? 1800 : 900;
  return (
    <>
      <World max={max} active={active} />
      <Arena swarmCount={swarm} />
    </>
  );
}

/** Writes fps + node count into the store every ~500ms for the HUD. */
function Stats() {
  const acc = useRef({ frames: 0, last: 0 });
  useFrame(() => {
    const a = acc.current;
    const now = performance.now();
    if (!a.last) a.last = now;
    a.frames++;
    const el = now - a.last;
    if (el >= 500) {
      const fps = Math.round((a.frames * 1000) / el);
      a.frames = 0;
      a.last = now;
      useStore.getState().set({ fps, nodes: runtime.activeCount });
    }
  });
  return null;
}

/** Postprocessing must never take down the page: on any error, render without it. */
class SafeEffects extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[three] postprocessing disabled:", err instanceof Error ? err.message : String(err));
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Effects() {
  const theme = useStore((s) => s.theme);
  const light = theme === "light";
  const base = light ? 0.25 : 1.1;
  // built by hand (not <Bloom ref>) so we can drive intensity per frame; the wrapper JSON-stringifies props
  const bloom = useMemo(
    () => new BloomEffect({ intensity: 1.1, luminanceThreshold: 0.2, luminanceSmoothing: 0.2, mipmapBlur: true, radius: 0.7 }),
    []
  );
  useEffect(() => () => bloom.dispose(), [bloom]);
  // boot flash surges the bloom
  useFrame(() => {
    bloom.intensity = base + runtime.flash * (light ? 0.3 : 1.6);
    // light: only near-white emissive highlights bloom, porcelain tiles must not haze
    bloom.luminanceMaterial.threshold = light ? 0.9 : 0.2;
  });
  if (light) {
    return (
      <EffectComposer key="light" multisampling={0} enableNormalPass={false}>
        {/* clay contact shadows between tiles / around the sculptures and core */}
        <N8AO aoRadius={1.7} intensity={2.4} distanceFalloff={1.2} quality="medium" halfRes color="#5B4FA0" />
        <primitive object={bloom} dispose={null} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer key="dark" multisampling={0} enableNormalPass={false}>
      <primitive object={bloom} dispose={null} />
      <Vignette offset={0.3} darkness={light ? 0 : 0.55} eskil={false} />
      {/* premultiply: grain only modulates rendered particles, never paints the transparent background; none in light */}
      <Noise premultiply opacity={light ? 0 : 0.35} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}

export default function Scene() {
  const max = useMemo(() => (typeof window === "undefined" ? 8000 : particleBudget(window.innerWidth)), []);
  const [quality, setQuality] = useState(1);
  const [dpr, setDpr] = useState(1.75);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    const onMove = (e: PointerEvent) => {
      const m = runtime.mouse;
      m.px = e.clientX;
      m.py = e.clientY;
      m.x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      m.y = -(e.clientY / Math.max(1, window.innerHeight)) * 2 + 1;
      m.active = true;
      m.moved = true;
    };
    const onLeave = () => { runtime.mouse.active = false; runtime.mouse.moved = true; };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  const active = Math.max(1000, Math.round(max * quality));

  return (
    <Canvas
      dpr={[1, dpr]}
      frameloop={hidden ? "never" : "always"}
      camera={{ fov: FOV, position: [0, 0, CAM_DIST], near: 0.1, far: 200 }}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance", premultipliedAlpha: true, stencil: false, depth: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <PerformanceMonitor
        flipflops={4}
        onDecline={() => {
          setDpr((d) => Math.max(1, +(d - 0.25).toFixed(2)));
          setQuality((q) => Math.max(0.45, +(q - 0.15).toFixed(2)));
        }}
        onIncline={() => {
          setDpr((d) => Math.min(1.75, +(d + 0.25).toFixed(2)));
          setQuality((q) => Math.min(1, +(q + 0.1).toFixed(2)));
        }}
        onFallback={() => {
          setDpr(1);
          setQuality(0.45);
        }}
      />
      <Starfield density={Math.min(1, max / 12000) * 0.6 + 0.4} />
      <Worlds max={max} active={active} />
      <Stats />
      <SafeEffects>
        <Effects />
      </SafeEffects>
    </Canvas>
  );
}
