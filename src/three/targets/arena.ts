import { fillDust, gauss, makeTarget, permute, Polyline, rng, samplePolylines, Target, V3 } from "./util";
import { sampleCrystal } from "./crystal";

/** Arena world constants (world units). */
export const HEX_S = 0.52; // hex corner radius (pointy along z)
export const FLOOR_R = 14;
export const MONO_R = 9;
export const CORE_Y = 2.5;

/** Pointy-top axial hex centres (x, z) within a disc of radius R. */
export function hexCentres(R: number, s = HEX_S): { x: number; z: number; q: number; r: number }[] {
  const out: { x: number; z: number; q: number; r: number }[] = [];
  const n = Math.ceil(R / (s * 1.5)) + 2;
  for (let q = -n * 2; q <= n * 2; q++) {
    for (let r = -n; r <= n; r++) {
      const x = s * Math.sqrt(3) * (q + r / 2);
      const z = s * 1.5 * r;
      if (Math.hypot(x, z) <= R) out.push({ x, z, q, r });
    }
  }
  return out;
}

/** World (x,z) -> rounded axial hex coords. */
export function worldToHex(x: number, z: number, s = HEX_S) {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * z) / s;
  const r = ((2 / 3) * z) / s;
  // cube rounding
  let rx = Math.round(q), rz = Math.round(r);
  const ry = Math.round(-q - r);
  const dx = Math.abs(rx - q), dy = Math.abs(ry - (-q - r)), dz = Math.abs(rz - r);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (!(dy > dz)) rz = -rx - ry;
  return { q: rx, r: rz };
}

/** Hero / engines / cta: faint dust motes floating through the arena volume. */
export function arenaDustTarget(n: number): Target {
  const r = rng(808);
  const t = makeTarget(n);
  for (let i = 0; i < n; i++) {
    const spark = r() < 0.05;
    const rad = spark ? Math.abs(gauss(r)) * 1.6 : Math.sqrt(r()) * 15;
    const a = r() * Math.PI * 2;
    t.pos[i * 3] = Math.cos(a) * rad;
    t.pos[i * 3 + 1] = spark ? CORE_Y - 1.5 + r() * 4.5 : 0.35 + Math.pow(r(), 1.6) * 7.5;
    t.pos[i * 3 + 2] = Math.sin(a) * rad;
    t.bright[i] = spark ? 0.45 + r() * 0.4 : 0.05 + r() * 0.13;
  }
  return permute(t);
}

function hexOutline(cx: number, cy: number, s: number): V3[] {
  const pts: V3[] = [];
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 3;
    pts.push([cx + Math.cos(a) * s, cy + Math.sin(a) * s, 0]);
  }
  return pts;
}

function tiltInPlace(t: Target, start: number, end: number, ang: number) {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = start; i < end; i++) {
    const y = t.pos[i * 3 + 1], z = t.pos[i * 3 + 2];
    t.pos[i * 3 + 1] = y * c - z * s;
    t.pos[i * 3 + 2] = y * s + z * c;
  }
}

/** Pricing plan 2: a structured hex mesh (honeycomb) with bright vertices. */
export function hexMeshTarget(n: number): Target {
  const r = rng(909);
  const t = makeTarget(n);
  const s = 0.42;
  const cells = hexCentres(2.3, s).map((h) => ({ x: h.x, y: h.z }));
  const lines: Polyline[] = cells.map((c) => ({ pts: hexOutline(c.x, c.y, s * 0.98), closed: true }));
  const nVert = Math.floor(n * 0.12);
  for (let k = 0; k < nVert; k++) {
    const c = cells[Math.floor(r() * cells.length)];
    const a = Math.PI / 2 + (Math.floor(r() * 6) * Math.PI) / 3;
    t.pos[k * 3] = c.x + Math.cos(a) * s + gauss(r) * 0.012;
    t.pos[k * 3 + 1] = c.y + Math.sin(a) * s + gauss(r) * 0.012;
    t.pos[k * 3 + 2] = gauss(r) * 0.012;
    t.bright[k] = 1.2 + r() * 0.6;
  }
  const nLines = Math.floor(n * 0.45);
  samplePolylines(t, nVert, nLines, lines, 255, 0.45, 0.006, r);
  tiltInPlace(t, 0, nVert + nLines, -0.85);
  fillDust(t, nVert + nLines, n, 3.2, 8, 0.07, r);
  return permute(t);
}

/** Pricing plan 3: a miniature arena: hex floor, crystal core and a ring of monolith lines. */
export function hexArenaTarget(n: number): Target {
  const r = rng(910);
  const t = makeTarget(n);
  const s = 0.3;
  const cells = hexCentres(2.5, s);
  const lines: Polyline[] = cells.map((c) => ({ pts: hexOutline(c.x, c.z, s * 0.92).map((p) => [p[0], 0, p[1]] as V3), closed: true }));
  const nFloor = Math.floor(n * 0.4);
  samplePolylines(t, 0, nFloor, lines, 255, 0.5, 0.004, r);
  for (let i = 0; i < nFloor; i++) {
    const d = Math.hypot(t.pos[i * 3], t.pos[i * 3 + 2]);
    t.bright[i] *= 1.25 - d / 3; // brighter near the core
  }
  const nCore = Math.floor(n * 0.1);
  sampleCrystal(t, nFloor, nCore, 0.32, r, 0, 0.75, 0, 1.2);
  // 14 monolith lines around the ring
  const nMono = Math.floor(n * 0.12);
  const monos: Polyline[] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const h = 0.55 + ((k * 37) % 7) * 0.06;
    monos.push({ pts: [[Math.cos(a) * 1.95, 0, Math.sin(a) * 1.95], [Math.cos(a) * 1.95, h, Math.sin(a) * 1.95]] });
  }
  samplePolylines(t, nFloor + nCore, nMono, monos, 255, 1.0, 0.01, r);
  const used = nFloor + nCore + nMono;
  tiltInPlace(t, 0, used, 0.42);
  fillDust(t, used, n, 3.2, 8, 0.07, r);
  return permute(t);
}
