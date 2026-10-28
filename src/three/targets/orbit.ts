import { gauss, makeTarget, NONE, permute, rng, Target } from "./util";

/**
 * Connected apps ("OrbitRings"): a soft, wide nebula halo with large, flat, tilted
 * orbital rings that FRAME the DOM's own core + logo rings (centred behind them, never
 * competing). Rings rotate at different speeds and directions. extra = [phi, radius, yJitter].
 */
const RINGS = [
  { r: 2.7, speed: 0.07, tx: 0.3, tz: 0.06 },
  { r: 3.6, speed: -0.05, tx: 0.24, tz: -0.08 },
  { r: 4.6, speed: 0.035, tx: 0.34, tz: 0.11 },
];
const NEBULA = 10;

export function orbitTarget(n: number): Target {
  const r = rng(44);
  const t = makeTarget(n, true);
  const e = t.extra as Float32Array;
  const nNeb = Math.floor(n * 0.42);
  const nDust = Math.floor(n * 0.08);
  const nRings = n - nNeb - nDust;
  // nebula: a flattened, hollow-centred gaussian disc (leaves the DOM core readable)
  for (let i = 0; i < nNeb; i++) {
    const a = r() * Math.PI * 2;
    const rad = 1.15 + Math.abs(gauss(r)) * 1.25;
    e[i * 3] = a;
    e[i * 3 + 1] = rad;
    e[i * 3 + 2] = gauss(r) * 0.22 * (1.6 / rad);
    t.bright[i] = r() < 0.03 ? 1.5 : 0.18 + r() * 0.32;
    t.group[i] = NEBULA;
  }
  const w0 = 0.28, w1 = 0.33;
  for (let k = 0; k < nRings; k++) {
    const i = nNeb + k;
    const x = r();
    const ring = x < w0 ? 0 : x < w0 + w1 ? 1 : 2;
    t.group[i] = ring;
    e[i * 3] = r() * Math.PI * 2;
    e[i * 3 + 1] = RINGS[ring].r + gauss(r) * 0.035;
    e[i * 3 + 2] = gauss(r) * 0.02;
    t.bright[i] = r() < 0.035 ? 1.9 : 0.42 + r() * 0.4;
  }
  for (let i = nNeb + nRings; i < n; i++) {
    const a = r() * Math.PI * 2, rad = 3 + r() * 4;
    t.pos[i * 3] = Math.cos(a) * rad;
    t.pos[i * 3 + 1] = gauss(r) * 1.4;
    t.pos[i * 3 + 2] = Math.sin(a) * rad * 0.5 - 1;
    t.bright[i] = 0.08 + r() * 0.12;
    t.group[i] = NONE;
  }
  return permute(t);
}

const rot = RINGS.map((g) => ({ cx: Math.cos(g.tx), sx: Math.sin(g.tx), cz: Math.cos(g.tz), sz: Math.sin(g.tz) }));
const NEB_TILT = { cx: Math.cos(0.42), sx: Math.sin(0.42) };

export function writeOrbit(src: Target, out: Float32Array, n: number, time: number) {
  const e = src.extra as Float32Array, p = src.pos;
  for (let i = 0; i < n; i++) {
    const g = src.group[i];
    const i3 = i * 3;
    if (g < 3) {
      const phi = e[i3] + time * RINGS[g].speed;
      const R = e[i3 + 1];
      const x = Math.cos(phi) * R, y = e[i3 + 2], z = Math.sin(phi) * R;
      const m = rot[g];
      const y1 = y * m.cx - z * m.sx, z1 = y * m.sx + z * m.cx; // about X (flatten toward the viewer)
      out[i3] = x * m.cz - y1 * m.sz; // about Z
      out[i3 + 1] = x * m.sz + y1 * m.cz;
      out[i3 + 2] = z1;
    } else if (g === NEBULA) {
      const R = e[i3 + 1];
      const phi = e[i3] + time * (0.09 / R);
      const x = Math.cos(phi) * R, y = e[i3 + 2], z = Math.sin(phi) * R;
      out[i3] = x;
      out[i3 + 1] = y * NEB_TILT.cx - z * NEB_TILT.sx;
      out[i3 + 2] = y * NEB_TILT.sx + z * NEB_TILT.cx;
    } else {
      out[i3] = p[i3]; out[i3 + 1] = p[i3 + 1]; out[i3 + 2] = p[i3 + 2];
    }
  }
}
