import type { ChapterId } from "@/lib/store";
import type { Layout } from "./runtime";

export type ChapterLayout = {
  pos: [number, number, number];
  scale: number;
  /** auto-rotation speed (rad/s); 0 = snap to front-facing */
  spin: number;
  tiltX: number;
  cam: [number, number, number];
  look: [number, number, number];
  /** Arena chapters: orbiting camera (radius, height, look target, rad/s) and a projection view offset (fraction of viewport). */
  arena?: { R: number; H: number; look: [number, number, number]; speed: number; vo: [number, number] };
};

const ARENA_BASE: ChapterLayout = { pos: [0, 0, 0], scale: 1, spin: 0, tiltX: 0, cam: [0, 0, 8], look: [0, 0, 0] };


export function chapterLayout(ch: ChapterId, L: Layout, pricingPlan: number): ChapterLayout {
  const { wide, visW, portrait } = L;
  const fit = (worldWidth: number, frac: number) => Math.min(1, (visW * frac) / worldWidth);
  switch (ch) {
    case "hero":
      // THE ARENA: low 3/4 cinematic orbit; core framed at ~68% x on desktop, centred + further back on mobile
      return {
        ...ARENA_BASE,
        arena: wide
          ? { R: 15.5, H: 5.2, look: [0, 1.35, 0], speed: 0.035, vo: [0.18, 0] }
          : { R: portrait ? 23 : 19, H: portrait ? 8.5 : 6.5, look: [0, portrait ? 0.4 : 1.0, 0], speed: 0.03, vo: [0, portrait ? -0.06 : 0] },
      };
    case "engines":
      // swing low along the monolith ring
      return {
        ...ARENA_BASE,
        arena: wide
          ? { R: 12.5, H: 1.5, look: [0, 2.0, 0], speed: 0.075, vo: [0.12, 0] }
          : { R: 17, H: 2.4, look: [0, 1.8, 0], speed: 0.06, vo: [0, 0] },
      };
    case "platform":
      // compact constellation band in the top ~28% of the viewport, above the DOM card track
      return {
        pos: [0, L.visH * 0.39, 0],
        scale: 1,
        spin: 0,
        tiltX: 0,
        cam: [0, 0, 8],
        look: [0, 0, 0],
      };
    case "how":
      return {
        pos: wide ? [0.55, 0, 0] : [0, portrait ? -0.3 : 0, 0],
        scale: wide ? 0.85 : 0.75,
        spin: 0.22,
        tiltX: 0.1,
        cam: wide ? [0.15, 0.25, 5.2] : [0, 0.2, 5.6],
        look: wide ? [0.15, 0, 0] : [0, 0, 0],
      };
    case "apps":
      return {
        // desktop: two columns, DOM core at ~(67%, 50%) of the viewport; mobile: centred under the heading
        pos: wide ? [(0.67 - 0.5) * visW, 0, -0.6] : [0, -0.9, -0.6],
        scale: wide ? 0.8 : fit(9.4, 1.05),
        spin: 0,
        tiltX: 0,
        cam: [0, 0.3, 8],
        look: [0, 0, 0],
      };
    case "download":
      return {
        pos: [0, wide ? -0.6 : -0.4, 0],
        scale: L.aspect < 0.9 ? fit(5.2, 0.9) : fit(8.6, 0.88),
        spin: 0,
        tiltX: 0,
        cam: [0, 0, 8],
        look: [0, 0, 0],
      };
    case "languages":
      return {
        pos: [0, wide ? -0.35 : portrait ? -0.6 : -0.2, -0.6],
        scale: 1,
        spin: 0,
        tiltX: 0,
        cam: [0, 0, 8],
        look: [0, 0, 0],
      };
    case "pricing":
      // above the cards: upper-centre, behind the section heading
      return {
        pos: [0, wide ? 1.75 : 2.0, -1],
        scale: pricingPlan >= 3 ? (wide ? 0.55 : fit(4.8, 0.55)) : wide ? 0.62 : fit(5.2, 0.7),
        spin: pricingPlan === 3 ? 0.14 : pricingPlan === 1 ? 0.1 : 0,
        tiltX: 0,
        cam: [0, 0, 8.5],
        look: [0, 0, 0],
      };
    case "cta":
      // wide, high shot of the whole arena on autopilot, centred behind the headline
      return {
        ...ARENA_BASE,
        arena: { R: wide ? 17 : 23, H: wide ? 10.5 : 14, look: [0, 0.4, 0], speed: 0.09, vo: [0, -0.04] },
      };
    case "footer":
    default:
      return {
        // centred on the DOM ghost word (~37% from the top); near the footer top on portrait
        pos: [0, portrait ? L.visH * 0.3 : L.visH * 0.13, 0],
        scale: 1,
        spin: 0,
        tiltX: 0,
        cam: [0, 0, 8],
        look: [0, 0, 0],
      };
  }
}

/** World width of text targets (independent of group scale, which is 1 for text chapters). */
export function languageTextWidth(L: Layout) {
  return L.wide ? Math.min(8, L.visW * 0.7) : L.visW * 0.85;
}
export function platformBandWidth(L: Layout) {
  return Math.min(7.6, L.visW * 0.72);
}
export function footerTextWidth(L: Layout) {
  return Math.min(9.5, L.visW * 0.79);
}
