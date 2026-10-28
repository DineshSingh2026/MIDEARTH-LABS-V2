"use client";
import { useEffect, useState } from "react";
import { useStore, CHAPTERS } from "@/lib/store";
import { lenis } from "@/lib/scroll";

type Tick = { id: string; label: string; pos: number; found: boolean };

/** Right-edge chapter rail filled by pageProgress, with clickable chapter ticks. */
export default function ScrollProgress() {
  const progress = useStore((s) => s.pageProgress);
  const chapter = useStore((s) => s.chapter);
  const [ticks, setTicks] = useState<Tick[]>(() =>
    CHAPTERS.map((c, i) => ({ id: c.id, label: c.label, pos: i / (CHAPTERS.length - 1), found: false })),
  );

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        setTicks(
          CHAPTERS.map((c, i) => {
            const el = document.querySelector(`[data-chapter="${c.id}"]`) as HTMLElement | null;
            if (!el) return { id: c.id, label: c.label, pos: i / (CHAPTERS.length - 1), found: false };
            const top = el.getBoundingClientRect().top + scrollY;
            return { id: c.id, label: c.label, pos: Math.min(1, Math.max(0, top / max)), found: true };
          }),
        );
      });
    };
    compute();
    addEventListener("resize", compute);
    const ro = new ResizeObserver(compute);
    ro.observe(document.body);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", compute); ro.disconnect(); };
  }, []);

  const go = (id: string) => {
    const el = document.querySelector(`[data-chapter="${id}"]`) as HTMLElement | null;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.4 });
    else el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <nav aria-label="Chapters" className="fixed right-[14px] top-[20%] z-[70] hidden h-[60%] w-[2px] md:block">
      <div className="absolute inset-0 rounded-full bg-line" />
      <div
        className="absolute inset-x-0 top-0 h-full origin-top rounded-full"
        style={{
          transform: `scaleY(${progress})`,
          background: "linear-gradient(180deg,#A98CFF 0%,#6FD0FF 100%)",
          boxShadow: "0 0 10px rgba(111,208,255,.45)",
        }}
      />
      <ol className="absolute inset-0">
        {ticks.map((t) => {
          const active = t.id === chapter;
          return (
            <li key={t.id} className="sp-tick group absolute right-1/2 translate-x-1/2 -translate-y-1/2" style={{ top: `${t.pos * 100}%` }}>
              <button
                type="button"
                onClick={() => go(t.id)}
                aria-label={t.label}
                aria-current={active ? "step" : undefined}
                disabled={!t.found}
                data-cursor="hover"
                className="grid h-5 w-5 place-items-center rounded-full disabled:cursor-default"
              >
                <span
                  aria-hidden="true"
                  className={`block rounded-full transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${active ? "h-[8px] w-[8px] bg-[#6FD0FF]" : "h-[6px] w-[6px] border border-line-strong bg-ground group-hover:border-accent"}`}
                  style={active ? { boxShadow: "0 0 0 3px rgba(111,208,255,.18), 0 0 14px #6FD0FF" } : undefined}
                />
              </button>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md border border-line px-2 py-1 font-mono text-[11px] tracking-[.06em] text-ink-soft opacity-0 transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"
                style={{ background: "var(--nav-bg)", backdropFilter: "blur(10px)" }}
              >
                {t.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
