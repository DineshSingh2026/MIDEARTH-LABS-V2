"use client";
import { useEffect, useRef, useState } from "react";

const CYCLE = 2.6; // seconds
const X0 = 62, XC = 262, YC = 96;
const ease = (k: number) => k * k * (3 - 2 * k);

/** Packet position for phase p: out on the upper lane, into the shield, back on the lower lane. */
function pos(p: number) {
  if (p < 0) return null;
  if (p < 0.36) { const k = ease(p / 0.36); return { x: X0 + (XC - 30 - X0) * k, y: 84 + (YC - 84) * Math.max(0, (k - 0.85) / 0.15) }; }
  if (p < 0.56) { const a = ((p - 0.36) / 0.2) * Math.PI * 2; return { x: XC + Math.cos(a + Math.PI) * 16, y: YC + Math.sin(a + Math.PI) * 16 }; }
  if (p < 0.9) { const k = ease((p - 0.56) / 0.34); return { x: XC - 30 - (XC - 30 - X0) * k, y: 108 - (108 - YC) * Math.max(0, 1 - k / 0.15) }; }
  return null;
}

/** 02 · A request packet travels into an isolated, shielded endpoint and returns. Latency readout is an example. */
export default function EndpointPulse({ running, reduced, accent = "#6FD0FF" }: { running: boolean; reduced: boolean; accent?: string }) {
  const [p, setP] = useState(0.45);
  const shown = useRef({ from: 0, to: 0, t0: 0 });
  const [disp, setDisp] = useState<number | null>(null);

  useEffect(() => {
    if (reduced) { setP(0.45); setDisp(42); return; }
    if (!running) return;
    let raf = 0; const start = performance.now() - p * CYCLE * 1000; let lastCycle = -1;
    const loop = (t: number) => {
      const el = (t - start) / 1000; const cyc = Math.floor(el / CYCLE); const ph = (el % CYCLE) / CYCLE;
      setP(ph);
      if (ph > 0.88 && cyc !== lastCycle) {
        lastCycle = cyc;
        const next = 28 + Math.round(Math.random() * 34);
        shown.current = { from: shown.current.to || next, to: next, t0: t };
      }
      const s = shown.current;
      if (s.to) { const k = Math.min(1, (t - s.t0) / 450); setDisp(Math.round(s.from + (s.to - s.from) * (1 - Math.pow(1 - k, 3)))); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reduced]);

  const inside = p >= 0.3 && p < 0.62 ? Math.sin(((p - 0.3) / 0.32) * Math.PI) : 0;
  const ring = p >= 0.36 && p < 0.62 ? (p - 0.36) / 0.26 : 0;
  const head = pos(p);
  const trail = Array.from({ length: 12 }, (_, k) => pos(p - (k + 1) * 0.008)).filter(Boolean) as { x: number; y: number }[];
  const breathe = 1 + Math.sin(p * Math.PI * 4) * 0.02;

  return (
    <div className="relative h-full w-full" aria-hidden>
      <svg viewBox="0 0 360 188" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="ep-bub" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor={accent} stopOpacity={0.05 + inside * 0.25} />
            <stop offset="0.75" stopColor={accent} stopOpacity={0.08 + inside * 0.12} />
            <stop offset="1" stopColor={accent} stopOpacity={0.35 + inside * 0.4} />
          </radialGradient>
          <filter id="ep-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
          <pattern id="ep-hex" width="10" height="17.32" patternUnits="userSpaceOnUse" patternTransform="scale(.8)">
            <path d="M5 0 L10 2.89 L10 8.66 L5 11.55 L0 8.66 L0 2.89 Z" fill="none" stroke={accent} strokeOpacity=".22" strokeWidth=".6" />
          </pattern>
          <clipPath id="ep-clip"><circle cx={XC} cy={YC} r={56} /></clipPath>
        </defs>
        {/* lanes */}
        <path d={`M${X0} 84 H${XC - 56}`} stroke={accent} strokeOpacity=".25" strokeDasharray="2 5" />
        <path d={`M${XC - 56} 108 H${X0}`} stroke={accent} strokeOpacity=".25" strokeDasharray="2 5" />
        <text x={(X0 + XC - 56) / 2} y={74} textAnchor="middle" className="mono" fontSize="8.5" fill="var(--ink-faint)" letterSpacing="1">REQUEST →</text>
        <text x={(X0 + XC - 56) / 2} y={124} textAnchor="middle" className="mono" fontSize="8.5" fill="var(--ink-faint)" letterSpacing="1">← RESPONSE</text>
        {/* client */}
        <circle cx={X0 - 22} cy={YC} r={18} fill="none" stroke={accent} strokeOpacity=".3" />
        <circle cx={X0 - 22} cy={YC} r={11} fill={accent} fillOpacity=".1" stroke={accent} strokeOpacity=".6" />
        <circle cx={X0 - 22} cy={YC} r={3.5} fill={accent} />
        {/* shield bubble */}
        <g transform={`translate(${XC} ${YC}) scale(${breathe}) translate(${-XC} ${-YC})`}>
          <circle cx={XC} cy={YC} r={56} fill={accent} fillOpacity={0.15 + inside * 0.25} filter="url(#ep-glow)" />
          <circle cx={XC} cy={YC} r={56} fill="url(#ep-bub)" />
          <rect x={XC - 56} y={YC - 56} width={112} height={112} fill="url(#ep-hex)" clipPath="url(#ep-clip)" opacity={0.6 + inside * 0.4} />
          <circle cx={XC} cy={YC} r={56} fill="none" stroke={accent} strokeOpacity={0.55 + inside * 0.45} strokeWidth={1.2} />
          <ellipse cx={XC - 18} cy={YC - 30} rx={20} ry={8} fill="#fff" opacity={0.08} transform={`rotate(-30 ${XC - 18} ${YC - 30})`} />
        </g>
        <circle cx={XC} cy={YC} r={56 + ring * 26} fill="none" stroke={accent} strokeWidth={1.5} opacity={ring ? (1 - ring) * 0.8 : 0} />
        {/* container core */}
        <rect x={XC - 20} y={YC - 20} width={40} height={40} rx={9} fill="rgba(6,8,26,.6)" stroke={accent} strokeOpacity={0.5 + inside * 0.5} />
        <path d={`M${XC} ${YC - 11} l8 3.4 v5.2 c0 5 -3.4 8.2 -8 10 c-4.6 -1.8 -8 -5 -8 -10 v-5.2 z`} fill={accent} fillOpacity={0.2 + inside * 0.5} stroke={accent} strokeWidth={1.2} />
        <text x={XC} y={YC + 72} textAnchor="middle" className="mono" fontSize="8.5" fill="var(--ink-faint)" letterSpacing="1.5">ISOLATED</text>
        {/* packet with comet trail */}
        {trail.map((t, k) => <circle key={k} cx={t.x} cy={t.y} r={3.4 * (1 - k / 12)} fill={accent} opacity={0.55 * (1 - k / 12)} />)}
        {head && <>
          <circle cx={head.x} cy={head.y} r={9} fill={accent} opacity={0.35} filter="url(#ep-glow)" />
          <circle cx={head.x} cy={head.y} r={3.6} fill="#fff" />
        </>}
      </svg>
      <div className="mono pointer-events-none absolute left-3 top-2.5 flex items-center gap-2 text-[11px]">
        <span style={{ color: "var(--ink-soft)" }}>latency</span>
        <span className="tabular-nums" style={{ color: accent, minWidth: "4.5ch", textShadow: `0 0 10px ${accent}` }}>{disp ?? "--"} ms</span>
        <span className="rounded-full border px-1.5 py-[1px] text-[9px] uppercase tracking-[.16em]" style={{ borderColor: "var(--line-strong)", color: "var(--ink-faint)" }}>example</span>
      </div>
    </div>
  );
}
