import { fillDust, makeTarget, permute, rng, Target } from "./util";
import { sampleCrystal } from "./crystal";

/** How it works: close-up of the runtime core, a faceted crystal with two thin halo rings. */
export function coreTarget(n: number): Target {
  const r = rng(33);
  const t = makeTarget(n);
  const nCore = Math.floor(n * 0.7);
  const nRing = Math.floor(n * 0.12);
  sampleCrystal(t, 0, nCore, 0.95, r);
  for (let k = 0; k < nRing; k++) {
    const i = nCore + k;
    const th = r() * Math.PI * 2;
    const second = r() < 0.5;
    const R = (second ? 1.55 : 1.25) + (r() - 0.5) * 0.015;
    const x = Math.cos(th) * R, z = Math.sin(th) * R;
    // two tilted rings
    const tilt = second ? -0.5 : 0.35;
    t.pos[i * 3] = x;
    t.pos[i * 3 + 1] = z * Math.sin(tilt);
    t.pos[i * 3 + 2] = z * Math.cos(tilt);
    t.bright[i] = 0.45 + r() * 0.35;
  }
  fillDust(t, nCore + nRing, n, 2.0, 4.6, 0.12, r);
  return permute(t);
}
