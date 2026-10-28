"use client";
import { useRef, ReactNode, MouseEvent, useEffect, useState } from "react";

/** Magnetic wrapper: pulls child up to `strength` px toward the cursor. */
export function Magnetic({ children, strength = 8, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const move = (e: MouseEvent) => {
    const el = ref.current!; const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2 * strength;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2 * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };
  return (
    <span ref={ref} onMouseMove={move} onMouseLeave={leave} className={`inline-block transition-transform duration-200 ease-[cubic-bezier(.16,1,.3,1)] ${className}`} data-cursor="hover">
      {children}
    </span>
  );
}

/** Spread onto a .spot/.conic-border element to feed --mx/--my and --angle from the cursor. */
export function spotHandlers() {
  return {
    onMouseMove: (e: MouseEvent<HTMLElement>) => {
      const el = e.currentTarget; const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty("--mx", `${x}px`); el.style.setProperty("--my", `${y}px`);
      const a = (Math.atan2(y - r.height / 2, x - r.width / 2) * 180) / Math.PI + 90;
      el.style.setProperty("--angle", `${a - 75}deg`);
    },
  };
}

/** Counts from 0 to `to` when visible. Renders mono digits. */
export function CountUp({ to, prefix = "", suffix = "", duration = 1400, className = "" }: { to: number; prefix?: string; suffix?: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(to); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => { const p = Math.min(1, (t - t0) / duration); setV(Math.round(to * (1 - Math.pow(1 - p, 4)))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el); return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref} className={className} aria-label={`${prefix}${to}${suffix}`}><span aria-hidden>{prefix}{v.toLocaleString("en-US")}{suffix}</span></span>;
}

/** Infinite marquee. Children are rendered twice. `reverse` moves right. Hover slows to 0.2x. */
export function Marquee({ children, reverse = false, seconds = 40, className = "" }: { children: ReactNode; reverse?: boolean; seconds?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const setRate = (r: number) => ref.current?.getAnimations().forEach((a) => (a.playbackRate = r));
  return (
    <div className={`marquee-mask overflow-hidden ${className}`} onMouseEnter={() => setRate(0.2)} onMouseLeave={() => setRate(1)}>
      <div ref={ref} className="flex w-max gap-3 py-2" style={{ animation: `marq ${seconds}s linear infinite ${reverse ? "reverse" : ""}` }}>
        <div className="flex gap-3 shrink-0">{children}</div>
        <div className="flex gap-3 shrink-0" aria-hidden>{children}</div>
      </div>
      <style>{`@keyframes marq{from{transform:translateX(0)}to{transform:translateX(calc(-50% - 6px))}}`}</style>
    </div>
  );
}
