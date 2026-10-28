import { gauss, makeTarget, NONE, permute, rng, Target } from "./util";
import { sampleCrystal } from "./crystal";

export const CLUSTERS = 6;
const CL_R = 0.24;

/** Per-cluster tints (violet, cyan, blue, magenta, teal, amber). */
export const CLUSTER_TINTS = ["#A98CFF", "#6FD0FF", "#4F8BFF", "#FF6AD5", "#3FE0C5", "#FFB86B"];

/**
 * Platform: 6 clusters laid out as a compact constellation band (the group sits in the top
 * ~28% of the viewport, above the DOM card track). Clustered particles store LOCAL offsets in
 * pos (group = cluster); extra = [isElectron, phase, orbitIdx].
 * Ungrouped particles draw thin connection lines between neighbours; extra = [segment, t, jitter].
 */
export function clustersTarget(n: number): Target {
  const r = rng(21);
  const t = makeTarget(n, true);
  const e = t.extra as Float32Array;
  const nLines = Math.floor(n * 0.12);
  const nCl = n - nLines;
  // each cluster is a small faceted crystal core
  sampleCrystal(t, 0, nCl, CL_R, r);
  for (let i = 0; i < nCl; i++) {
    const c = i % CLUSTERS;
    const electron = r() < 0.12;
    t.group[i] = c;
    e[i * 3] = electron ? 1 : 0;
    e[i * 3 + 1] = r() * Math.PI * 2;
    e[i * 3 + 2] = Math.floor(r() * 3);
  }
  for (let i = nCl; i < n; i++) {
    e[i * 3] = Math.floor(r() * (CLUSTERS - 1));
    e[i * 3 + 1] = r();
    e[i * 3 + 2] = gauss(r);
    t.bright[i] = 0.32 + r() * 0.25;
    t.group[i] = NONE;
  }
  return permute(t);
}

const sn: number[] = [0, 0, 0, 0, 0, 0], cn: number[] = [1, 1, 1, 1, 1, 1];
const ORBITS = [0, 1, 2].map((k) => {
  const ax = 0.5 + k * 0.85, ay = k * 1.1;
  return { cx: Math.cos(ax), sx: Math.sin(ax), cy: Math.cos(ay), sy: Math.sin(ay), R: 1.55 + k * 0.3, w: 2.6 - k * 0.55 };
});

/**
 * Writes group-local band positions + brightness for this frame.
 * act[c] is an eased 0..1 "active" amount per cluster; bandW is the band width in world units.
 */
export function writeClusters(src: Target, out: Float32Array, bOut: Float32Array, n: number, bandW: number, act: number[], time: number) {
  const cx: number[] = [], cy: number[] = [], cz: number[] = [], cs: number[] = [], cb: number[] = [];
  const spacing = bandW / (CLUSTERS - 1);
  const k = Math.min(1, spacing / 1.5); // shrink clusters on narrow screens
  for (let c = 0; c < CLUSTERS; c++) {
    const a = act[c];
    cx[c] = (c - (CLUSTERS - 1) / 2) * spacing;
    // gentle constellation zig-zag + breathing
    cy[c] = (c % 2 ? 0.16 : -0.12) * k + Math.sin(time * 0.6 + c * 1.3) * 0.05;
    cz[c] = a * 0.35;
    cs[c] = k * (1 + a * 0.5);
    cb[c] = 0.35 + a * 1.35;
  }
  const p = src.pos, e = src.extra as Float32Array;
  for (let c = 0; c < CLUSTERS; c++) { const a = time * (0.35 + act[c] * 0.5) + c * 1.7; sn[c] = Math.sin(a); cn[c] = Math.cos(a); }
  for (let i = 0; i < n; i++) {
    const g = src.group[i];
    const i3 = i * 3;
    if (g !== NONE) {
      const s = cs[g];
      // slow per-crystal spin
      const sa = sn[g], ca = cn[g];
      const px = p[i3], pz = p[i3 + 2];
      let lx = (px * ca - pz * sa) * s, ly = p[i3 + 1] * s, lz = (px * sa + pz * ca) * s;
      let b = src.bright[i] * cb[g];
      const a = act[g];
      if (e[i3] > 0.5 && a > 0.01) {
        // electron: orbit the active cluster on one of 3 tilted orbits
        const o = ORBITS[e[i3 + 2] | 0];
        const ph = e[i3 + 1] + time * o.w;
        const R = o.R * CL_R * s;
        const x0 = Math.cos(ph) * R, z0 = Math.sin(ph) * R;
        const y1 = -z0 * o.sx, z1 = z0 * o.cx;
        const x2 = x0 * o.cy + z1 * o.sy, z2 = -x0 * o.sy + z1 * o.cy;
        lx += (x2 - lx) * a; ly += (y1 - ly) * a; lz += (z2 - lz) * a;
        b += a * 1.4;
      }
      out[i3] = cx[g] + lx;
      out[i3 + 1] = cy[g] + ly;
      out[i3 + 2] = cz[g] + lz;
      bOut[i] = b;
    } else {
      const seg = e[i3] | 0;
      const tt = e[i3 + 1];
      const a = seg, b = seg + 1;
      const j = e[i3 + 2] * 0.008;
      out[i3] = cx[a] + (cx[b] - cx[a]) * tt;
      out[i3 + 1] = cy[a] + (cy[b] - cy[a]) * tt + j;
      out[i3 + 2] = cz[a] + (cz[b] - cz[a]) * tt + j;
      // lines leading to the active cluster glow a bit more
      bOut[i] = src.bright[i] * (0.6 + 0.5 * Math.max(act[a], act[b]));
    }
  }
}
