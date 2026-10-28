"use client";
import { useEffect, useState, RefObject } from "react";

/** prefers-reduced-motion, read in an effect (SSR-safe: false on first render). */
export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setR(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}

/** Viewport visibility of a ref. `once` keeps it true after the first hit. */
export function useInView(ref: RefObject<Element | null>, { once = false, threshold = 0.2, rootMargin = "0px" } = {}) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setV(true);
          if (once) io.disconnect();
        } else if (!once) setV(false);
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, once, threshold, rootMargin]);
  return v;
}

/** document.visibilityState === "visible" */
export function usePageVisible() {
  const [v, setV] = useState(true);
  useEffect(() => {
    const f = () => setV(document.visibilityState === "visible");
    f();
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  return v;
}

/** true unless <html data-theme="light">. Watches the attribute. */
export function useIsDark(dep?: unknown) {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const read = () => setDark(document.documentElement.dataset.theme !== "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [dep]);
  return dark;
}
