import { gauss, Target } from "./util";

/** Icosahedron (unit circumradius) vertices + edges, used for faceted "crystal core" particle shapes. */
const PHI = (1 + Math.sqrt(5)) / 2;
const RAW: [number, number, number][] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
];
const L = Math.hypot(1, PHI);
export const ICO_V = RAW.map(([x, y, z]) => [x / L, y / L, z / L] as [number, number, number]);
export const ICO_E: [number, number][] = [];
for (let a = 0; a < 12; a++) {
  for (let b = a + 1; b < 12; b++) {
    const d = Math.hypot(ICO_V[a][0] - ICO_V[b][0], ICO_V[a][1] - ICO_V[b][1], ICO_V[a][2] - ICO_V[b][2]);
    if (d < 1.1) ICO_E.push([a, b]);
  }
}

/**
 * Writes `count` particles from `start` as a faceted crystal of radius `rad` centred at (cx,cy,cz):
 * bright vertices, glowing edges and a faint inner fill. Brightness is multiplied by `bMul`.
 */
export function sampleCrystal(t: Target, start: number, count: number, rad: number, r: () => number, cx = 0, cy = 0, cz = 0, bMul = 1, group = 255) {
  for (let k = 0; k < count; k++) {
    const i = start + k;
    const x = r();
    let px: number, py: number, pz: number, b: number;
    if (x < 0.12) {
      const v = ICO_V[Math.floor(r() * 12)];
      const j = rad * 0.035;
      px = v[0] * rad + gauss(r) * j; py = v[1] * rad + gauss(r) * j; pz = v[2] * rad + gauss(r) * j;
      b = 1.5 + r() * 0.6;
    } else if (x < 0.8) {
      const [a, c] = ICO_E[Math.floor(r() * ICO_E.length)];
      const f = r();
      const A = ICO_V[a], C = ICO_V[c];
      const j = rad * 0.012;
      px = (A[0] + (C[0] - A[0]) * f) * rad + gauss(r) * j;
      py = (A[1] + (C[1] - A[1]) * f) * rad + gauss(r) * j;
      pz = (A[2] + (C[2] - A[2]) * f) * rad + gauss(r) * j;
      b = 0.75 + r() * 0.45;
    } else {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const rr = rad * 0.55 * Math.pow(r(), 0.6);
      px = s * Math.cos(th) * rr; py = u * rr; pz = s * Math.sin(th) * rr;
      b = 0.35 + r() * 0.4;
    }
    t.pos[i * 3] = cx + px; t.pos[i * 3 + 1] = cy + py; t.pos[i * 3 + 2] = cz + pz;
    t.bright[i] = b * bMul;
    t.group[i] = group;
  }
}
