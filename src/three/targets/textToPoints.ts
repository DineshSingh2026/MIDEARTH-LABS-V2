import { fillDust, makeTarget, permute, rng, Target } from "./util";
import { arenaDustTarget } from "./arena";

const FONT_STACK =
  '"Segoe UI", "Noto Sans", "Nirmala UI", "Noto Sans Devanagari", "Hiragino Sans", "Yu Gothic", "Microsoft YaHei", "PingFang SC", "Microsoft JhengHei", sans-serif';

type Pixels = { pts: Float32Array; count: number; w: number; h: number };
const cache = new Map<string, Pixels>();

/** Rasterises text on a 2D canvas and returns filled pixel coordinates (step 2px). */
export function textPixels(text: string, weight = "bold", spacing = 0): Pixels | null {
  const key = `${weight}|${spacing}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  if (!ctx) return null;
  const font = `${weight} 160px ${FONT_STACK}`;
  ctx.font = font;
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (spacing && "letterSpacing" in c) c.letterSpacing = `${spacing}px`;
  const m = ctx.measureText(text);
  const w = Math.ceil(m.width + 40 + Math.abs(spacing) * text.length);
  const h = 240;
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  if (spacing && "letterSpacing" in c) c.letterSpacing = `${spacing}px`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);
  const data = ctx.getImageData(0, 0, w, h).data;
  const tmp: number[] = [];
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3] > 128) {
        tmp.push(x, y);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (tmp.length < 20) return null;
  const count = tmp.length / 2;
  const pts = new Float32Array(tmp.length);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  for (let i = 0; i < count; i++) {
    pts[i * 2] = tmp[i * 2] - cx;
    pts[i * 2 + 1] = cy - tmp[i * 2 + 1];
  }
  const res = { pts, count, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
  cache.set(key, res);
  return res;
}

/**
 * Particle text target. `width` is the world-space width of the text block,
 * capped by `maxHeight` so tall scripts don't overflow.
 */
export function textTarget(n: number, text: string, width: number, maxHeight = 2.2, opts: { weight?: string; spacing?: number; seed?: number } = {}): Target {
  const px = textPixels(text, opts.weight ?? "bold", opts.spacing ?? 0);
  if (!px) return arenaDustTarget(n);
  const r = rng(opts.seed ?? 77);
  const t = makeTarget(n);
  const scale = Math.min(width / px.w, maxHeight / px.h);
  const nText = Math.floor(n * 0.9);
  const jitter = 2 * scale;
  for (let i = 0; i < nText; i++) {
    const k = Math.floor(r() * px.count);
    t.pos[i * 3] = px.pts[k * 2] * scale + (r() - 0.5) * jitter;
    t.pos[i * 3 + 1] = px.pts[k * 2 + 1] * scale + (r() - 0.5) * jitter;
    t.pos[i * 3 + 2] = (r() - 0.5) * 0.12;
    t.bright[i] = 0.6 + r() * 0.55;
  }
  fillDust(t, nText, n, Math.max(width * 0.55, 2.5), Math.max(width * 0.9, 5), 0.1, r);
  return permute(t);
}
