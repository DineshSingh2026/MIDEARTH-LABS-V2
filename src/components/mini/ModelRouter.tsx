"use client";
import { useEffect, useState } from "react";

const ROUTES = [
  { label: "Claude", c: "#D97757", y: 40 },
  { label: "Codex", c: "#10A37F", y: 94 },
  { label: "LLM", c: "#A98CFF", y: 148 },
];
const RX = 150, RY = 94, OX = 250;
const IN = `M28 ${RY} H${RX - 20}`;
const out = (y: number) => `M${RX + 20} ${RY} C ${RX + 62} ${RY}, ${OX - 50} ${y}, ${OX} ${y}`;

/** 06 · A router node switches an agent's stream between model providers; the live route glows in its colour. */
export default function ModelRouter({ running, reduced, accent = "#FFB86B" }: { running: boolean; reduced: boolean; accent?: string }) {
  const [r, setR] = useState(0);
  useEffect(() => {
    if (!running || reduced) return;
    const id = setInterval(() => setR((v) => (v + 1) % ROUTES.length), 1700);
    return () => clearInterval(id);
  }, [running, reduced]);
  const cur = ROUTES[r];
  const live = running && !reduced;
  const play = live ? "running" : "paused";

  return (
    <div className="relative h-full w-full" aria-hidden>
      <style>{`@keyframes mr-flow{to{stroke-dashoffset:-24}}@keyframes mr-halo{0%{transform:scale(.7);opacity:.8}100%{transform:scale(1.9);opacity:0}}`}</style>
      <svg viewBox="0 0 360 188" className="h-full w-full">
        <defs>
          <filter id="mr-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        {/* input stream */}
        <circle cx={22} cy={RY} r={10} fill={accent} opacity=".25" filter="url(#mr-glow)" />
        <circle cx={22} cy={RY} r={4.5} fill={accent} />
        <path d={IN} stroke={accent} strokeOpacity=".25" />
        <path d={IN} stroke={accent} strokeWidth={2} strokeDasharray="4 8" strokeLinecap="round" style={{ animation: "mr-flow .7s linear infinite", animationPlayState: play }} />
        <text x={30} y={RY - 10} className="mono" fontSize="8.5" fill="var(--ink-faint)" letterSpacing="1">AGENT</text>
        {ROUTES.map((o, i) => {
          const on = i === r;
          return (
            <g key={o.label}>
              <path d={out(o.y)} fill="none" stroke={o.c} strokeOpacity={on ? 0.3 : 0.12} strokeWidth={1} style={{ transition: "stroke-opacity .4s" }} />
              <path d={out(o.y)} fill="none" stroke={o.c} strokeWidth={6} filter="url(#mr-glow)" style={{ opacity: on ? 0.55 : 0, transition: "opacity .45s" }} />
              <path d={out(o.y)} fill="none" stroke={o.c} strokeWidth={2.2} strokeDasharray="4 8" strokeLinecap="round"
                style={{ opacity: on ? 1 : 0, transition: "opacity .45s", animation: "mr-flow .7s linear infinite", animationPlayState: play }} />
              {on && live && [0, 0.33, 0.66].map((b) => (
                <circle key={b} r={2.4} fill="#fff" style={{ filter: `drop-shadow(0 0 4px ${o.c})` }}>
                  <animateMotion dur="1.1s" begin={`${b * 1.1}s`} repeatCount="indefinite" path={out(o.y)} />
                </circle>
              ))}
              <g transform={`translate(${OX} ${o.y - 14})`}>
                <rect width={94} height={28} rx={14} fill={on ? `color-mix(in oklab, ${o.c} 20%, rgba(6,8,26,.85))` : "rgba(6,8,26,.6)"} stroke={o.c} strokeOpacity={on ? 1 : 0.3}
                  style={{ transition: "all .45s", filter: on ? `drop-shadow(0 0 10px ${o.c}aa)` : "none" }} />
                <circle cx={15} cy={14} r={4} fill={o.c} opacity={on ? 1 : 0.4} style={{ filter: on ? `drop-shadow(0 0 4px ${o.c})` : "none" }} />
                <text x={27} y={18} fontSize="11.5" fontWeight={700} style={{ fill: on ? "var(--ink)" : "var(--ink-faint)", transition: "fill .4s" }}>{o.label}</text>
              </g>
            </g>
          );
        })}
        {/* router */}
        <g transform={`translate(${RX} ${RY})`}>
          {live && <circle key={r} r={20} fill="none" stroke={cur.c} strokeWidth={1.5} style={{ transformOrigin: "0 0", animation: "mr-halo 1s ease-out forwards" }} />}
          <circle r={26} fill={cur.c} opacity=".18" filter="url(#mr-glow)" style={{ transition: "fill .45s" }} />
          <rect x={-15} y={-15} width={30} height={30} rx={6} transform="rotate(45)" fill="rgba(6,8,26,.85)" stroke={cur.c} strokeWidth={1.6}
            style={{ transition: "stroke .45s", filter: `drop-shadow(0 0 10px ${cur.c})` }} />
          <rect x={-7} y={-7} width={14} height={14} rx={3} transform="rotate(45)" fill={cur.c} style={{ transition: "fill .45s" }} />
        </g>
        <text x={RX} y={RY + 40} textAnchor="middle" className="mono" fontSize="8.5" fill="var(--ink-faint)" letterSpacing="1.5">ROUTER</text>
      </svg>
      <div className="mono pointer-events-none absolute left-3 top-2.5 text-[11px]" style={{ color: "var(--ink-faint)" }}>
        route → <span style={{ color: cur.c, transition: "color .4s", textShadow: `0 0 10px ${cur.c}` }}>{cur.label.toLowerCase()}</span>
      </div>
    </div>
  );
}
