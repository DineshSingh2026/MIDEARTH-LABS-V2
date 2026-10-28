"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useStore, CHAPTERS, ChapterId } from "./store";

gsap.registerPlugin(ScrollTrigger);

export let lenis: Lenis | null = null;

/** Lenis + ScrollTrigger sync, chapter tracking, reduced-motion / webgl / theme detection. Mounted once in layout. */
export function ScrollProvider() {
  const set = useStore((s) => s.set);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const theme = (document.documentElement.dataset.theme as "dark" | "light") || "dark";
    let webgl = true;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { webgl = false; }
    set({ reducedMotion: reduced, theme, webgl });
    if (reduced) document.documentElement.classList.add("reduced");

    let raf = 0;
    function onAnchor(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a || !lenis) return;
      const id = a.getAttribute("href")!;
      const el = id === "#top" ? 0 : document.querySelector(id);
      if (el !== null) { e.preventDefault(); lenis.scrollTo(el as any, { duration: 1.4 }); }
    }
    if (!reduced) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis?.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      document.addEventListener("click", onAnchor);
    }

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pageProgress = max > 0 ? scrollY / max : 0;
      const mid = innerHeight * 0.5;
      let active: ChapterId = "hero";
      let cp = 0;
      for (const c of CHAPTERS) {
        const el = document.querySelector(`[data-chapter="${c.id}"]`) as HTMLElement | null;
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid) { active = c.id; cp = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height))); }
      }
      const s = useStore.getState();
      if (s.chapter !== active || Math.abs(s.chapterProgress - cp) > 0.002 || Math.abs(s.pageProgress - pageProgress) > 0.002)
        set({ chapter: active, chapterProgress: cp, pageProgress });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);

    const mo = new MutationObserver(() => set({ theme: (document.documentElement.dataset.theme as any) || "dark" }));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(raf); lenis?.destroy(); lenis = null;
      removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll);
      document.removeEventListener("click", onAnchor); mo.disconnect();
    };
  }, [set]);
  return null;
}
