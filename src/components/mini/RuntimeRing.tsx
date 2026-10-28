"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

const PARTS = ["compute", "memory", "tools", "environments", "identity", "model access", "connectivity"];
const LOOP = ["observe", "reason", "act", "learn"];
const CX = 180, CY = 94, R = 56, RI = 30, RO = 68;

const r2 = (v: number) => Math.round(v * 100) / 100;
const polar = (deg: number, r: number) => { const a = (deg * Math.PI) / 180; return [r2(CX + r * Math.cos(a)), r2(CY + r * Math.sin(a))]; };
const arc = (a0: number, a1: number, r: number) => {
  const [x0, y0] = polar(a0, r); const [x1, y1] = polar(a1, r);
  return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`;
};

/** 04 · Seven runtime parts light up in sequence on a glowing orbit around an observe → reason → act → learn loop. */
export default function RuntimeRing({ running, reduced, accent = "#E07BFF" }: { running: boolean; reduced: boolean; accent?: string }) {
  const L = useStore((s) => s.theme) === "light";
  const [tick, setTick] = useState(7);
  useEffect(() => {
    if (reduced) { setTick(7); return; }
    if (!running) return;
    setTick(0);
    const id = setInterval(() => setTick((t) => t + 1), 650);
    return () => clearInterval(id);
  }, [running, reduced]);

  const lit = reduced ? 7 : Math.min(7, tick % 10);
  const loopI = tick % 4;
  const seg = 360 / PARTS.length;
  const play = running && !reduced ? "running" : "paused";

  return (
    <svg viewBox="0 0 360 188" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="rr-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={L ? accent : "#fff"} stopOpacity=".9" /><stop offset=".35" stopColor={accent} /><stop offset="1" stopColor="#7C5CFF" /></linearGradient>
        <filter id="rr-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" /></filter>
        <radialGradient id="rr-core"><stop offset="0" stopColor={accent} stopOpacity=".35" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
      </defs>
      <style>{`@keyframes rr-orbit{to{transform:rotate(360deg)}}@keyframes rr-orbit-r{to{transform:rotate(-360deg)}}`}</style>
      <circle cx={CX} cy={CY} r={RO + 6} fill="url(#rr-core)" />
      {/* outer orbit with travelling highlight */}
      <circle cx={CX} cy={CY} r={RO} fill="none" stroke={accent} strokeOpacity=".18" strokeDasharray="1 4" />
      <g style={{ transformOrigin: `${CX}px ${CY}px`, animation: "rr-orbit 5s linear infinite", animationPlayState: play }}>
        <circle cx={CX} cy={CY} r={RO} fill="none" stroke={accent} strokeWidth="3" strokeDasharray={`60 ${2 * Math.PI * RO}`} strokeLinecap="round" filter="url(#rr-glow)" />
        <circle cx={CX} cy={CY} r={RO} fill="none" stroke={L ? "#5B2EE0" : "#fff"} strokeWidth="1.2" strokeDasharray={`28 ${2 * Math.PI * RO}`} strokeDashoffset="-30" strokeLinecap="round" />
      </g>
      {PARTS.map((p, i) => {
        const a0 = -90 + i * seg + 3, a1 = -90 + (i + 1) * seg - 3, mid = (a0 + a1) / 2;
        const on = i < lit; const head = i === lit - 1 && !reduced && tick % 10 < 8;
        const [lx, ly] = polar(mid, RO + 14);
        const cos = Math.cos((mid * Math.PI) / 180);
        const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
        return (
          <g key={p}>
            <path d={arc(a0, a1, R)} fill="none" stroke={accent} strokeOpacity=".14" strokeWidth={8} strokeLinecap="round" />
            {head && <path d={arc(a0, a1, R)} fill="none" stroke={accent} strokeWidth={12} strokeLinecap="round" filter="url(#rr-glow)" />}
            <path d={arc(a0, a1, R)} fill="none" stroke="url(#rr-g)" strokeWidth={8} strokeLinecap="round" style={{ opacity: on ? 1 : 0, transition: "opacity .35s" }} />
            <text x={lx} y={ly + 3} textAnchor={anchor} className="mono" fontSize="9.5"
              style={{ fill: on ? (head ? (L ? "var(--ink)" : "#fff") : "var(--ink-soft)") : "var(--ink-faint)", opacity: on ? 1 : 0.5, transition: "opacity .35s, fill .35s" }}>{p}</text>
          </g>
        );
      })}
      {/* inner loop */}
      <circle cx={CX} cy={CY} r={RI} fill={L ? "#FFFFFF" : "rgba(6,8,26,.55)"} stroke={accent} strokeOpacity=".35" strokeDasharray="2 3" />
      <g style={{ transformOrigin: `${CX}px ${CY}px`, animation: "rr-orbit-r 2.6s linear infinite", animationPlayState: play }}>
        <circle cx={CX} cy={CY - RI} r={6} fill={accent} opacity=".5" filter="url(#rr-glow)" />
        <circle cx={CX} cy={CY - RI} r={2.8} fill={L ? accent : "#fff"} />
      </g>
      <text key={loopI} x={CX} y={CY + 1} textAnchor="middle" className="mono" fontSize="9.5" fontWeight={700} style={{ fill: "var(--ink)" }}>{LOOP[loopI]}</text>
      <text x={CX} y={CY + 13} textAnchor="middle" className="mono" fontSize="7" style={{ fill: accent }}>→ {LOOP[(loopI + 1) % 4]}</text>
    </svg>
  );
}
