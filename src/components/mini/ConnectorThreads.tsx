"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

const AX = 72, AY = 94, BX = 246;
const TARGETS = [
  { label: "API", y: 30 },
  { label: "DB", y: 72 },
  { label: "browser", y: 116 },
  { label: "cloud", y: 158 },
];
const path = (y: number) => `M${AX + 22} ${AY} C ${AX + 96} ${AY}, ${BX - 84} ${y}, ${BX} ${y}`;

function Icon({ i }: { i: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (i === 0) return <path {...p} d="M-2 -5 C-5 -5 -4 -1 -6 0 C-4 1 -5 5 -2 5 M2 -5 C5 -5 4 -1 6 0 C4 1 5 5 2 5" />;
  if (i === 1) return <g {...p}><ellipse cx="0" cy="-4" rx="5" ry="2" /><path d="M-5 -4 V4 C-5 6.5 5 6.5 5 4 V-4 M-5 0 C-5 2.5 5 2.5 5 0" /></g>;
  if (i === 2) return <g {...p}><rect x="-6" y="-5" width="12" height="10" rx="1.5" /><path d="M-6 -2 H6" /></g>;
  return <path {...p} d="M-4 4 H4 A3.5 3.5 0 0 0 4 -3 A4.5 4.5 0 0 0 -4.5 -1.5 A3 3 0 0 0 -4 4 Z" />;
}

/** 05 · An agent node threads out to API / DB / browser / cloud; each turns connected and packets start to flow. */
export default function ConnectorThreads({ running, reduced, accent = "#3DDBB4" }: { running: boolean; reduced: boolean; accent?: string }) {
  const L = useStore((s) => s.theme) === "light";
  const [stage, setStage] = useState(10);
  useEffect(() => {
    if (reduced) { setStage(10); return; }
    if (!running) return;
    setStage(0);
    const id = setInterval(() => setStage((s) => (s + 1) % 14), 520);
    return () => clearInterval(id);
  }, [running, reduced]);
  const live = running && !reduced;

  return (
    <svg viewBox="0 0 360 188" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="ct-g" x1="0" x2="1"><stop offset="0" stopColor={L ? accent : "#fff"} stopOpacity=".7" /><stop offset=".4" stopColor={accent} /><stop offset="1" stopColor={accent} /></linearGradient>
        <filter id="ct-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" /></filter>
        <radialGradient id="ct-node"><stop offset="0" stopColor={accent} stopOpacity=".55" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
      </defs>
      <style>{`@keyframes ct-pop{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.6);opacity:0}}@keyframes ct-spin{to{transform:rotate(360deg)}}`}</style>
      {TARGETS.map((t, i) => {
        const on = stage >= 1 + i * 2 && stage < 12;
        const done = stage >= 2 + i * 2 && stage < 12;
        return (
          <g key={t.label}>
            <path d={path(t.y)} fill="none" stroke={accent} strokeOpacity=".12" strokeWidth={1} strokeDasharray="2 4" />
            <path d={path(t.y)} fill="none" stroke={accent} strokeWidth={4} pathLength={1} strokeDasharray="1 1" filter="url(#ct-glow)" opacity=".5"
              style={{ strokeDashoffset: on ? 0 : 1, transition: reduced ? "none" : "stroke-dashoffset .55s cubic-bezier(.65,0,.35,1)" }} />
            <path d={path(t.y)} fill="none" stroke="url(#ct-g)" strokeWidth={1.6} pathLength={1} strokeDasharray="1 1"
              style={{ strokeDashoffset: on ? 0 : 1, transition: reduced ? "none" : "stroke-dashoffset .55s cubic-bezier(.65,0,.35,1)" }} />
            {done && live && [0, 0.5].map((b) => (
              <g key={b}>
                <circle r={5} fill={accent} opacity=".45" filter="url(#ct-glow)">
                  <animateMotion dur="1.5s" begin={`${b * 1.5}s`} repeatCount="indefinite" path={path(t.y)} keyPoints={i % 2 ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear" />
                </circle>
                <circle r={2} fill={L ? accent : "#fff"}>
                  <animateMotion dur="1.5s" begin={`${b * 1.5}s`} repeatCount="indefinite" path={path(t.y)} keyPoints={i % 2 ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear" />
                </circle>
              </g>
            ))}
            <g transform={`translate(${BX} ${t.y - 13})`}>
              {done && live && <rect width={98} height={26} rx={13} fill="none" stroke={accent} style={{ transformOrigin: "49px 13px", animation: "ct-pop .7s ease-out forwards" }} />}
              <rect width={98} height={26} rx={13} fill={L ? (done ? `color-mix(in oklab, ${accent} 12%, #FFFFFF)` : "#FFFFFF") : done ? `color-mix(in oklab, ${accent} 14%, rgba(6,8,26,.8))` : "rgba(6,8,26,.6)"}
                stroke={done ? accent : L ? "rgba(91,46,224,.22)" : "rgba(160,150,230,.25)"} style={{ transition: "all .3s", filter: done ? `drop-shadow(0 0 8px ${accent}88)` : "none" }} />
              <g transform="translate(16 13)" style={{ color: done ? accent : "var(--ink-faint)" }}><Icon i={i} /></g>
              <text x={30} y={16.5} className="mono" fontSize="10" style={{ fill: done ? "var(--ink)" : "var(--ink-faint)" }}>{t.label}</text>
              <g transform="translate(84 13)" style={{ opacity: done ? 1 : 0, transition: "opacity .3s" }}>
                <circle r={6.5} fill={accent} />
                <path d="M-3 0 L-1 2.2 L3 -2.2" fill="none" stroke={L ? "#fff" : "#04140F"} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
          </g>
        );
      })}
      {/* agent node */}
      <circle cx={AX} cy={AY} r={44} fill="url(#ct-node)" />
      <g style={{ transformOrigin: `${AX}px ${AY}px`, animation: "ct-spin 8s linear infinite", animationPlayState: live ? "running" : "paused" }}>
        <circle cx={AX} cy={AY} r={31} fill="none" stroke={accent} strokeOpacity=".5" strokeDasharray="3 6" />
      </g>
      <circle cx={AX} cy={AY} r={22} fill={L ? "#FFFFFF" : "rgba(6,8,26,.75)"} stroke="url(#ct-g)" strokeWidth={1.5} />
      <text x={AX} y={AY + 3.5} textAnchor="middle" className="mono" fontSize="9.5" style={{ fill: "var(--ink)" }}>agent</text>
    </svg>
  );
}
