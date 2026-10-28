"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, label, summary, [data-cursor="hover"]';

/** Custom ring + dot cursor for fine pointers; crosshair with node id over the globe. */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const hoverNode = useStore((s) => s.hoverNode);
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);
  const [down, setDown] = useState(false);

  useEffect(() => {
    const mq = matchMedia("(pointer: fine)");
    const upd = () => setEnabled(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const k = reduced ? 1 : 0.18;
    let mx = 0, my = 0, rx = 0, ry = 0, raf = 0, seen = false, shown = false;
    const show = (v: boolean) => { if (shown !== v) { shown = v; setVisible(v); } };

    const move = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (!seen) { seen = true; rx = mx; ry = my; } // snap on first move, never animate in from 0,0
      show(true);
    };
    const over = (e: Event) => setHovering(!!(e.target as Element | null)?.closest?.(INTERACTIVE));
    const out = (e: MouseEvent) => { if (!e.relatedTarget) show(false); };
    const hide = () => show(false);
    const pd = () => setDown(true), pu = () => setDown(false);
    const loop = () => {
      if (seen) {
        rx += (mx - rx) * k; ry += (my - ry) * k;
        if (dot.current) dot.current.style.transform = `translate3d(${mx}px,${my}px,0)`;
        if (ring.current) ring.current.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    addEventListener("mousemove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("mouseout", out);
    document.documentElement.addEventListener("mouseleave", hide);
    addEventListener("blur", hide);
    addEventListener("pointerdown", pd); addEventListener("pointerup", pu);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("mousemove", move);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("mouseout", out);
      document.documentElement.removeEventListener("mouseleave", hide);
      removeEventListener("blur", hide);
      removeEventListener("pointerdown", pd); removeEventListener("pointerup", pu);
    };
  }, [enabled]);

  if (!enabled) return null;
  const cross = !!hoverNode;
  const size = cross ? 44 : hovering ? 56 : 28;

  return (
    <div aria-hidden="true" data-cursor-layer="" className="pointer-events-none fixed inset-0 z-[150]" style={{ opacity: visible ? 1 : 0, visibility: visible ? "visible" : "hidden", transition: visible ? "opacity .3s" : "opacity .3s, visibility 0s .3s" }}>
      <div ref={ring} className="absolute left-0 top-0 will-change-transform" style={{ transform: "translate3d(-300px,-300px,0)" }}>
        <div
          className="absolute rounded-full transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
          style={{
            width: size, height: size, left: -size / 2, top: -size / 2,
            border: `1px solid ${cross ? "#6FD0FF" : "var(--accent)"}`,
            background: hovering && !cross ? "color-mix(in oklab, var(--accent) 12%, transparent)" : "transparent",
            transform: `scale(${down ? 0.85 : 1}) rotate(${cross ? 45 : 0}deg)`,
            borderRadius: cross ? 4 : 999,
            boxShadow: cross ? "0 0 16px rgba(111,208,255,.35)" : "none",
          }}
        />
        {/* crosshair arms */}
        <div className="absolute transition-opacity duration-300" style={{ opacity: cross ? 1 : 0 }}>
          <span className="absolute h-px w-[14px] bg-[#6FD0FF]" style={{ left: -36, top: 0 }} />
          <span className="absolute h-px w-[14px] bg-[#6FD0FF]" style={{ left: 22, top: 0 }} />
          <span className="absolute h-[14px] w-px bg-[#6FD0FF]" style={{ left: 0, top: -36 }} />
          <span className="absolute h-[14px] w-px bg-[#6FD0FF]" style={{ left: 0, top: 22 }} />
          <span
            className="absolute whitespace-nowrap rounded border border-[rgba(111,208,255,.35)] px-1.5 py-0.5 font-mono text-[11px] tracking-[.04em] text-[#CFF1FF]"
            style={{ left: 30, top: 18, background: "rgba(6,8,26,.78)" }}
          >
            {hoverNode}
          </span>
        </div>
      </div>
      <div ref={dot} className="absolute left-0 top-0 will-change-transform" style={{ transform: "translate3d(-300px,-300px,0)" }}>
        <div
          className="absolute h-[5px] w-[5px] rounded-full transition-[background,transform] duration-300"
          style={{ left: -2.5, top: -2.5, background: cross ? "#6FD0FF" : "var(--accent)", transform: `scale(${hovering && !cross ? 0 : 1})` }}
        />
      </div>
    </div>
  );
}
