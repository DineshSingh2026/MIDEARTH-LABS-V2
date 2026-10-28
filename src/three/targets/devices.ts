import { circle, fillRect, makeTarget, permute, Polyline, rng, roundedRect, samplePolylines, Target, V3 } from "./util";

type Device = { lines: Polyline[]; face: [number, number, number, number]; width: number };

function laptop(): Device {
  return {
    width: 2.4,
    lines: [
      { pts: roundedRect(0, 0.3, 2.0, 1.25, 0.06), closed: true, weight: 1.3 },
      { pts: roundedRect(0, 0.32, 1.84, 1.07, 0.02), closed: true, weight: 0.5 },
      { pts: [[-1.0, -0.33, 0], [1.0, -0.33, 0], [1.2, -0.55, 0.32], [-1.2, -0.55, 0.32]] as V3[], closed: true, weight: 1.2 },
      { pts: [[-0.25, -0.46, 0.2], [0.25, -0.46, 0.2], [0.27, -0.52, 0.27], [-0.27, -0.52, 0.27]] as V3[], closed: true, weight: 0.6 },
    ],
    face: [0, 0.32, 1.8, 1.03],
  };
}

function desktop(): Device {
  const content: Polyline[] = [0.62, 0.48, 0.34, 0.2, 0.06].map((y, k) => ({
    pts: [[-0.9, y, 0], [-0.9 + 0.5 + ((k * 37) % 9) / 9, y, 0]] as V3[],
    weight: 0.45,
  }));
  return {
    width: 2.2,
    lines: [
      { pts: roundedRect(0, 0.3, 2.1, 1.3, 0.06), closed: true, weight: 1.3 },
      { pts: [[-1.05, 0.8, 0], [1.05, 0.8, 0]] as V3[], weight: 0.8 },
      { pts: circle(-0.93, 0.88, 0.028, 0, 10), closed: true, weight: 1.5 },
      { pts: circle(-0.84, 0.88, 0.028, 0, 10), closed: true, weight: 1.5 },
      { pts: circle(-0.75, 0.88, 0.028, 0, 10), closed: true, weight: 1.5 },
      ...content,
      { pts: [[0, -0.35, 0], [0, -0.6, 0]] as V3[], weight: 1.2 },
      { pts: [[-0.42, -0.62, 0.05], [0.42, -0.62, 0.05]] as V3[], weight: 1.2 },
    ],
    face: [0, 0.27, 2.0, 1.0],
  };
}

function android(): Device {
  return {
    width: 0.85,
    lines: [
      { pts: roundedRect(0, 0.1, 0.8, 1.6, 0.1), closed: true, weight: 1.3 },
      { pts: circle(0, 0.8, 0.035, 0, 12), closed: true, weight: 2.5 },
      { pts: [[-0.12, -0.62, 0], [0.12, -0.62, 0]] as V3[], weight: 0.6 },
    ],
    face: [0, 0.1, 0.72, 1.5],
  };
}

function iphone(): Device {
  return {
    width: 0.85,
    lines: [
      { pts: roundedRect(0, 0.1, 0.8, 1.62, 0.17, 0, 8), closed: true, weight: 1.3 },
      { pts: roundedRect(0, 0.8, 0.24, 0.07, 0.034, 0, 6), closed: true, weight: 2.5 },
      { pts: [[-0.14, -0.6, 0], [0.14, -0.6, 0]] as V3[], weight: 0.6 },
    ],
    face: [0, 0.1, 0.72, 1.5],
  };
}

/** Download: 4 device silhouettes (mac laptop, windows desktop, android, iPhone). group = device index. */
export function devicesTarget(n: number, layout: "row" | "grid"): Target {
  const r = rng(55);
  const t = makeTarget(n);
  const devs = [laptop(), desktop(), android(), iphone()];
  let offsets: [number, number][];
  if (layout === "row") {
    const gap = 0.75;
    const total = devs.reduce((a, d) => a + d.width, 0) + gap * (devs.length - 1);
    let x = -total / 2;
    offsets = devs.map((d) => {
      const c = x + d.width / 2;
      x += d.width + gap;
      return [c, -0.1];
    });
  } else {
    offsets = [[-1.25, 1.05], [1.25, 1.05], [-0.6, -1.15], [0.6, -1.15]];
  }
  const per = Math.floor(n / 4);
  for (let d = 0; d < 4; d++) {
    const start = d * per;
    const count = d === 3 ? n - start : per;
    const nLines = Math.floor(count * 0.64);
    const dev = devs[d];
    const [ox, oy] = offsets[d];
    const lines = dev.lines.map((l) => ({ ...l, pts: l.pts.map((p) => [p[0] + ox, p[1] + oy, p[2]] as V3) }));
    samplePolylines(t, start, nLines, lines, d, 1.0, 0.025, r);
    const [fx, fy, fw, fh] = dev.face;
    fillRect(t, start + nLines, count - nLines, fx + ox, fy + oy, fw, fh, -0.02, d, 0.28, r);
  }
  return permute(t);
}
