"use client";
import { create } from "zustand";

/** Chapter ids, in scroll order. Each <section data-chapter="..."> uses one of these. */
export const CHAPTERS = [
  { id: "hero", label: "Hero" },
  { id: "engines", label: "Engines" },
  { id: "platform", label: "The Platform" },
  { id: "how", label: "How It Works" },
  { id: "apps", label: "Connected Apps" },
  { id: "download", label: "Download" },
  { id: "languages", label: "Languages" },
  { id: "pricing", label: "Pricing" },
  { id: "cta", label: "Get Started" },
  { id: "footer", label: "Footer" },
] as const;
export type ChapterId = (typeof CHAPTERS)[number]["id"];

type State = {
  chapter: ChapterId;            // active chapter (set by ScrollProvider)
  pageProgress: number;          // 0..1 whole page scroll
  chapterProgress: number;       // 0..1 progress through active chapter
  theme: "dark" | "light";
  reducedMotion: boolean;
  webgl: boolean;                // false when WebGL unavailable
  booted: boolean;               // preloader finished
  hoverChip: number | null;      // hero chip index 0..5 -> cluster highlight
  engineColor: string | null;    // hex colour of hovered engine chip
  platformIndex: number;         // active platform card 0..5
  howStep: number;               // active how-it-works step 0..3
  langIndex: number;             // active language 0..9
  pricingHover: number | null;   // hovered plan 0..3
  deviceIndex: number;           // highlighted platform 0..3 (mac, win, android, ios)
  hoverNode: string | null;      // node id under cursor on the globe (for Cursor crosshair)
  fps: number;
  nodes: number;
  set: (p: Partial<State>) => void;
};

export const useStore = create<State>((set) => ({
  chapter: "hero",
  pageProgress: 0,
  chapterProgress: 0,
  theme: "dark",
  reducedMotion: false,
  webgl: true,
  booted: false,
  hoverChip: null,
  engineColor: null,
  platformIndex: 0,
  howStep: 0,
  langIndex: 0,
  pricingHover: null,
  deviceIndex: 0,
  hoverNode: null,
  fps: 60,
  nodes: 12288,
  set: (p) => set(p),
}));
