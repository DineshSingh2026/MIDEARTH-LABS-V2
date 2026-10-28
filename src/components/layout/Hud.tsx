"use client";
import { useEffect, useState } from "react";
import { useStore, CHAPTERS } from "@/lib/store";

/** Decorative bottom-left instrumentation readout. */
export default function Hud() {
  const chapter = useStore((s) => s.chapter);
  const [stats, setStats] = useState({ fps: 60, nodes: 12288 });

  useEffect(() => {
    const tick = () => {
      const { fps, nodes } = useStore.getState();
      setStats((p) => (p.fps === Math.round(fps) && p.nodes === nodes ? p : { fps: Math.round(fps), nodes }));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  const idx = Math.max(0, CHAPTERS.findIndex((c) => c.id === chapter));
  const label = CHAPTERS[idx].label.toUpperCase();

  return (
    <div
      aria-hidden="true"
      className="hud pointer-events-none fixed z-[60] hidden w-max max-w-none select-none whitespace-nowrap rounded-lg px-3 py-2 font-mono text-[11px] leading-[1.6] tracking-[.08em] text-ink-faint tabular-nums md:block"
      style={{ left: "max(20px, env(safe-area-inset-left))", bottom: "max(20px, env(safe-area-inset-bottom))", opacity: chapter === "footer" ? 0 : 1, transform: chapter === "footer" ? "translateY(8px)" : "none", transition: "opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1)" }}
    >
      <div className="flex items-center gap-2">
        <span className="hud-dot relative inline-block h-[6px] w-[6px] rounded-full bg-[#6FD0FF]" />
        <span>
          CH.{String(idx + 1).padStart(2, "0")} <span className="opacity-50">/</span> <span className="text-ink-muted">{label}</span>
        </span>
      </div>
      <div className="pl-[14px] opacity-80">
        fps {stats.fps} <span className="opacity-50">·</span> nodes: {stats.nodes.toLocaleString("en-US")}
      </div>
      <style>{`
        .hud{background:color-mix(in oklab,var(--ground) 55%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid color-mix(in oklab,var(--line) 70%,transparent)}
        .hud-dot{box-shadow:0 0 8px #6FD0FF}
        :root[data-theme="light"] .hud-dot{background:#5B2EE0;box-shadow:0 0 0 2px rgba(91,46,224,.12)}
        :root[data-theme="light"] .hud-dot::after{border-color:#5B2EE0}
        .hud-dot::after{content:"";position:absolute;inset:-3px;border-radius:99px;border:1px solid #6FD0FF;opacity:0;animation:hudp 1.8s cubic-bezier(.16,1,.3,1) infinite}
        @keyframes hudp{0%{transform:scale(.4);opacity:.9}100%{transform:scale(2);opacity:0}}
      `}</style>
    </div>
  );
}
