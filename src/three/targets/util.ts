/** Shared helpers for particle target generation. */
export const NONE = 255;

export type Target = {
  /** xyz per particle */
  pos: Float32Array;
  /** base brightness per particle */
  bright: Float32Array;
  /** group id per particle (sector / cluster / device / ring), NONE when ungrouped */
  group: Uint8Array;
  /** optional per-particle extra data (3 floats per particle) for dynamic targets */
  extra: Float32Array | null;
};

export function makeTarget(n: number, withExtra = false): Target {
  return {
    pos: new Float32Array(n * 3),
    bright: new Float32Array(n).fill(1),
    group: new Uint8Array(n).fill(NONE),
    extra: withExtra ? new Float32Array(n * 3) : null,
  };
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const permCache = new Map<number, Uint32Array>();
/** Fixed random permutation so that any prefix [0, k) is a uniform subset (used for LOD via drawRange). */
export function permutation(n: number): Uint32Array {
  let p = permCache.get(n);
  if (p) return p;
  p = new Uint32Array(n);
  for (let i = 0; i < n; i++) p[i] = i;
  const r = rng(1337);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  permCache.set(n, p);
  return p;
}

/** Returns a new target whose particle i is the source particle perm[i]. */
export function permute(t: Target): Target {
  const n = t.bright.length;
  const perm = permutation(n);
  const o = makeTarget(n, !!t.extra);
  for (let i = 0; i < n; i++) {
    const j = perm[i];
    o.pos[i * 3] = t.pos[j * 3]; o.pos[i * 3 + 1] = t.pos[j * 3 + 1]; o.pos[i * 3 + 2] = t.pos[j * 3 + 2];
    o.bright[i] = t.bright[j];
    o.group[i] = t.group[j];
    if (t.extra && o.extra) {
      o.extra[i * 3] = t.extra[j * 3]; o.extra[i * 3 + 1] = t.extra[j * 3 + 1]; o.extra[i * 3 + 2] = t.extra[j * 3 + 2];
    }
  }
  return o;
}

export function gauss(r: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Random direction scaled by radius, written to out at i. */
export function setOnSphere(out: Float32Array, i: number, radius: number, r: () => number, cx = 0, cy = 0, cz = 0) {
  const u = r() * 2 - 1;
  const th = r() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  out[i * 3] = cx + s * Math.cos(th) * radius;
  out[i * 3 + 1] = cy + u * radius;
  out[i * 3 + 2] = cz + s * Math.sin(th) * radius;
}

/** Faint background dust in a spherical shell. */
export function fillDust(t: Target, start: number, end: number, rMin: number, rMax: number, bright: number, r: () => number) {
  for (let i = start; i < end; i++) {
    const rad = rMin + Math.pow(r(), 0.7) * (rMax - rMin);
    setOnSphere(t.pos, i, rad, r);
    t.bright[i] = bright * (0.5 + r() * 0.8);
    t.group[i] = NONE;
  }
}

export type V3 = [number, number, number];
export type Polyline = { pts: V3[]; closed?: boolean; weight?: number };

function polyLength(p: Polyline) {
  let L = 0;
  const n = p.pts.length;
  const segs = p.closed ? n : n - 1;
  for (let s = 0; s < segs; s++) {
    const a = p.pts[s], b = p.pts[(s + 1) % n];
    L += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  return L;
}

/** Distributes `count` particles along polylines (proportional to length * weight), writing into t from `start`. */
export function samplePolylines(t: Target, start: number, count: number, lines: Polyline[], group: number, bright: number, jitter: number, r: () => number) {
  const lens = lines.map((l) => polyLength(l) * (l.weight ?? 1));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  for (let k = 0; k < count; k++) {
    const i = start + k;
    let x = r() * total;
    let li = 0;
    while (li < lines.length - 1 && x > lens[li]) { x -= lens[li]; li++; }
    const line = lines[li];
    const n = line.pts.length;
    const segs = line.closed ? n : n - 1;
    // pick a point along this polyline uniformly by length
    let d = r() * polyLength(line);
    let px = line.pts[0][0], py = line.pts[0][1], pz = line.pts[0][2];
    for (let s = 0; s < segs; s++) {
      const a = line.pts[s], b = line.pts[(s + 1) % n];
      const sl = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (d <= sl || s === segs - 1) {
        const f = sl > 0 ? Math.min(1, d / sl) : 0;
        px = a[0] + (b[0] - a[0]) * f; py = a[1] + (b[1] - a[1]) * f; pz = a[2] + (b[2] - a[2]) * f;
        break;
      }
      d -= sl;
    }
    t.pos[i * 3] = px + (r() - 0.5) * jitter;
    t.pos[i * 3 + 1] = py + (r() - 0.5) * jitter;
    t.pos[i * 3 + 2] = pz + (r() - 0.5) * jitter;
    t.bright[i] = bright * (0.75 + r() * 0.5);
    t.group[i] = group;
  }
}

export function roundedRect(cx: number, cy: number, w: number, h: number, rad: number, z = 0, seg = 6): V3[] {
  const pts: V3[] = [];
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  const corners: [number, number, number][] = [
    [x1 - rad, y1 - rad, 0],
    [x0 + rad, y1 - rad, Math.PI / 2],
    [x0 + rad, y0 + rad, Math.PI],
    [x1 - rad, y0 + rad, Math.PI * 1.5],
  ];
  for (const [ccx, ccy, a0] of corners) {
    for (let s = 0; s <= seg; s++) {
      const a = a0 + (s / seg) * (Math.PI / 2);
      pts.push([ccx + Math.cos(a) * rad, ccy + Math.sin(a) * rad, z]);
    }
  }
  return pts;
}

export function circle(cx: number, cy: number, rad: number, z = 0, seg = 16): V3[] {
  const pts: V3[] = [];
  for (let s = 0; s < seg; s++) {
    const a = (s / seg) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, z]);
  }
  return pts;
}

/** Uniform fill of an axis-aligned rect (dim face). */
export function fillRect(t: Target, start: number, count: number, cx: number, cy: number, w: number, h: number, z: number, group: number, bright: number, r: () => number) {
  for (let k = 0; k < count; k++) {
    const i = start + k;
    t.pos[i * 3] = cx + (r() - 0.5) * w;
    t.pos[i * 3 + 1] = cy + (r() - 0.5) * h;
    t.pos[i * 3 + 2] = z + (r() - 0.5) * 0.04;
    t.bright[i] = bright * (0.5 + r() * 0.7);
    t.group[i] = group;
  }
}
