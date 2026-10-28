import { hexArenaTarget, hexMeshTarget } from "./arena";
import { fillDust, gauss, makeTarget, permute, Polyline, rng, samplePolylines, Target, V3 } from "./util";

/** Tight star: a hot core plus a soft glow halo. */
function star(t: Target, start: number, count: number, c: V3, coreSigma: number, r: () => number) {
  const nCore = Math.floor(count * 0.55);
  for (let k = 0; k < count; k++) {
    const i = start + k;
    const core = k < nCore;
    const s = core ? coreSigma : coreSigma * 5;
    t.pos[i * 3] = c[0] + gauss(r) * s;
    t.pos[i * 3 + 1] = c[1] + gauss(r) * s;
    t.pos[i * 3 + 2] = c[2] + gauss(r) * s;
    t.bright[i] = core ? 1.3 + r() * 0.9 : 0.22 + r() * 0.25;
  }
}

/** Faint, far dust so the plan shapes stay crisp against it. */
function dust(t: Target, start: number, n: number, r: () => number) {
  fillDust(t, start, n, 3.2, 8, 0.07, r);
}

/** Pricing density by plan: 0 one core, 1 five linked cores, 2 hex mesh, 3 a miniature arena. */
export function pricingTarget(n: number, plan: number): Target {
  if (plan >= 3) return hexArenaTarget(n);
  if (plan === 2) return hexMeshTarget(n);
  const r = rng(66 + plan);
  const t = makeTarget(n);
  if (plan <= 0) {
    const nStar = Math.floor(n * 0.06);
    star(t, 0, nStar, [0, 0, 0], 0.035, r);
    // a faint orbit ring around the lone node
    const nRing = Math.floor(n * 0.05);
    for (let k = 0; k < nRing; k++) {
      const i = nStar + k;
      const a = r() * Math.PI * 2;
      const R = 0.75 + gauss(r) * 0.015;
      t.pos[i * 3] = Math.cos(a) * R;
      t.pos[i * 3 + 1] = Math.sin(a) * R * 0.3;
      t.pos[i * 3 + 2] = Math.sin(a) * R * 0.2;
      t.bright[i] = 0.3 + r() * 0.25;
    }
    dust(t, nStar + nRing, n, r);
    return permute(t);
  }
  if (plan === 1) {
    const nodes: V3[] = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + Math.PI / 2;
      nodes.push([Math.cos(a) * 1.55, Math.sin(a) * 1.25, Math.sin(a * 2) * 0.3]);
    }
    const per = Math.floor(n * 0.035);
    for (let k = 0; k < 5; k++) star(t, k * per, per, nodes[k], 0.03, r);
    const nLinks = Math.floor(n * 0.2);
    const links: Polyline[] = [];
    for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) {
      const ring = b - a === 1 || (a === 0 && b === 4);
      links.push({ pts: [nodes[a], nodes[b]], weight: ring ? 1.4 : 0.55 });
    }
    samplePolylines(t, 5 * per, nLinks, links, 255, 0.5, 0.008, r);
    dust(t, 5 * per + nLinks, n, r);
    return permute(t);
  }
  return permute(t);
}
