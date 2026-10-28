"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { runtime } from "./runtime";
import { rng } from "./targets/util";
import { pointScale } from "./util3d";

const vert = /* glsl */ `
uniform float uScale;
uniform float uTime;
attribute float aSeed;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.8) + aSeed * 60.0);
  gl_PointSize = clamp((0.05 + aSeed * 0.07) * uScale / max(0.1, -mv.z), 0.5, 4.0);
  gl_Position = projectionMatrix * mv;
  vA = tw * (0.35 + aSeed * 0.65);
}
`;
const frag = /* glsl */ `
uniform float uOpacity;
uniform vec3 uCol;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * vA * uOpacity;
  gl_FragColor = vec4(uCol, a);
}
`;

const LAYERS = [
  { z: -14, count: 700, spread: 34, parallax: 0.35, spin: 0.004 },
  { z: -24, count: 600, spread: 52, parallax: 0.2, spin: -0.003 },
  { z: -38, count: 500, spread: 80, parallax: 0.08, spin: 0.002 },
];

/** Depth-layered starfield with mouse parallax (lives in world space, behind everything). */
export default function Starfield({ density = 1 }: { density?: number }) {
  const layers = useMemo(
    () =>
      LAYERS.map((L, li) => {
        const r = rng(500 + li);
        const n = Math.round(L.count * density);
        const pos = new Float32Array(n * 3);
        const seed = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          pos[i * 3] = (r() - 0.5) * L.spread * 1.8;
          pos[i * 3 + 1] = (r() - 0.5) * L.spread;
          pos[i * 3 + 2] = L.z + (r() - 0.5) * 6;
          seed[i] = Math.pow(r(), 2.2);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, L.z), 200);
        return g;
      }),
    [density]
  );
  const uniforms = useMemo(() => ({ uScale: { value: 1000 }, uTime: { value: 0 }, uOpacity: { value: 0 }, uCol: { value: new THREE.Color("#C9D6FF") } }), []);
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
    [uniforms]
  );
  useEffect(() => () => { layers.forEach((g) => g.dispose()); }, [layers]);
  useEffect(() => () => { mat.dispose(); }, [mat]);

  const refs = useRef<(THREE.Object3D | null)[]>([]);
  const rootRef = useRef<THREE.Group>(null);
  const theme = useRef("");
  const m = useRef({ x: 0, y: 0 });

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.2);
    const s = useStore.getState();
    if (theme.current !== s.theme) {
      theme.current = s.theme;
      const light = s.theme === "light";
      uniforms.uCol.value.set(light ? "#7B5CF0" : "#C9D6FF");
      mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      mat.needsUpdate = true;
    }
    const goal = (s.booted ? 1 : 0) * (s.theme === "light" ? 0.28 : 0.9);
    uniforms.uOpacity.value += (goal - uniforms.uOpacity.value) * (1 - Math.pow(0.97, dt * 60));
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uScale.value = pointScale(state);
    // sky-dome behaviour: the star layers ride with the camera (the arena camera orbits)
    if (rootRef.current) {
      rootRef.current.position.copy(state.camera.position);
      rootRef.current.quaternion.copy(state.camera.quaternion);
    }
    const mm = runtime.mouse;
    const k = 1 - Math.pow(0.95, dt * 60);
    m.current.x += ((mm.active ? mm.x : 0) - m.current.x) * k;
    m.current.y += ((mm.active ? mm.y : 0) - m.current.y) * k;
    LAYERS.forEach((L, i) => {
      const p = refs.current[i];
      if (!p) return;
      p.position.x = -m.current.x * L.parallax * 3;
      p.position.y = -m.current.y * L.parallax * 2;
      p.rotation.z += L.spin * dt;
    });
  });

  return (
    <group ref={rootRef}>
      {layers.map((g, i) => (
        <points key={i} ref={(el) => { refs.current[i] = el; }} geometry={g} material={mat} frustumCulled={false} renderOrder={-20} />
      ))}
    </group>
  );
}
