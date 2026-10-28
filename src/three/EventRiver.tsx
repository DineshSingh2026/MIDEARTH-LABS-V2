"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { engineColor } from "@/content/site";
import { riverFrag, riverVert } from "./shaders/particles";
import { rng } from "./targets/util";

/**
 * Three engine streams (claude / codex / grok) flowing in from the left and merging
 * into one white event river flowing right. Paths are evaluated in the vertex shader.
 */
export default function EventRiver({ count }: { count: number }) {
  const geo = useMemo(() => {
    const r = rng(123);
    const pos = new Float32Array(count * 3);
    const stream = new Float32Array(count);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    const off = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      stream[i] = i % 3;
      phase[i] = r();
      speed[i] = 0.07 + r() * 0.05;
      const a = r() * Math.PI * 2, rad = Math.sqrt(r());
      off[i * 3] = (r() - 0.5) * 0.6;
      off[i * 3 + 1] = Math.cos(a) * rad;
      off[i * 3 + 2] = Math.sin(a) * rad;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aStream", new THREE.BufferAttribute(stream, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    g.setAttribute("aOff", new THREE.BufferAttribute(off, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: riverVert,
        fragmentShader: riverFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: 1000 },
          uVis: { value: 0 },
          uLight: { value: 0 },
          uC0: { value: new THREE.Color(engineColor.claude ?? "#D97757") },
          uC1: { value: new THREE.Color(engineColor.codex ?? "#10A37F") },
          uC2: { value: new THREE.Color(engineColor.grok ?? "#FFFFFF") },
          uWhite: { value: new THREE.Color("#FFFFFF") },
        },
      }),
    []
  );
  useEffect(() => () => { geo.dispose(); }, [geo]);
  useEffect(() => () => { mat.dispose(); }, [mat]);

  const ref = useRef<THREE.Points>(null);
  const themeRef = useRef("");

  useFrame((state, dt) => {
    const s = useStore.getState();
    const u = mat.uniforms;
    if (themeRef.current !== s.theme) {
      themeRef.current = s.theme;
      const light = s.theme === "light";
      u.uLight.value = light ? 1 : 0;
      u.uC2.value.set(light ? "#14173A" : engineColor.grok ?? "#FFFFFF");
      u.uWhite.value.set(light ? "#5B2EE0" : "#FFFFFF");
      mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      mat.needsUpdate = true;
    }
    const goal = s.chapter === "how" && s.booted ? (s.howStep >= 2 ? 1 : 0.22) : 0;
    u.uVis.value += (goal - u.uVis.value) * (1 - Math.pow(1 - 0.05, Math.min(dt, 0.05) * 60));
    u.uTime.value = state.clock.elapsedTime;
    const cam = state.camera as THREE.PerspectiveCamera;
    u.uScale.value = (state.size.height * state.gl.getPixelRatio() * 0.5) / Math.tan(THREE.MathUtils.degToRad((cam.fov || 45) / 2));
    if (ref.current) ref.current.visible = u.uVis.value > 0.005;
  });

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
