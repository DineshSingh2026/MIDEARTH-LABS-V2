"use client";
import { useEffect, useState } from "react";

const N = 6;
const INIT_LOAD = [42, 68, 30, 81, 55, 24];
const INIT_LED = [[1, 0, 1], [1, 1, 0], [1, 0, 0], [1, 1, 1], [1, 0, 1], [1, 0, 0]];
const HIST = 14;
const INIT_HIST = INIT_LOAD.map((v) => Array.from({ length: HIST }, (_, k) => Math.round(v * (0.6 + 0.4 * ((k * 7) % 5) / 4))));

/** 03 · A rack of units: LEDs bloom, load bars and per-unit sparklines move as work flows through. */
export default function ServerRack({ running, reduced, accent = "#4F8BFF" }: { running: boolean; reduced: boolean; accent?: string }) {
  const [load, setLoad] = useState<number[]>(INIT_LOAD);
  const [led, setLed] = useState<number[][]>(INIT_LED);
  const [hist, setHist] = useState<number[][]>(INIT_HIST);

  useEffect(() => {
    if (!running || reduced) return;
    let cur = load;
    const id = setInterval(() => {
      const nl = cur.map((v) => Math.max(8, Math.min(97, v + (Math.random() - 0.5) * 44)));
      cur = nl;
      setLoad(nl);
      setHist((h) => h.map((row, i) => [...row.slice(1), Math.round(nl[i])]));
      setLed((ls) => ls.map((row) => row.map((v, j) => (j === 0 ? 1 : Math.random() < 0.5 ? 1 - v : v))));
    }, 850);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reduced]);

  return (
    <div className="relative flex h-full w-full items-center justify-center px-4" aria-hidden>
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-xl border px-4 py-3"
        style={{ borderColor: `color-mix(in oklab, ${accent} 35%, transparent)`, background: "linear-gradient(180deg, rgba(10,14,40,.85), rgba(6,8,26,.7))", boxShadow: `0 0 40px -10px ${accent}55, inset 0 1px 0 rgba(255,255,255,.05)` }}>
        <span className="absolute inset-y-2 left-1.5 w-[2px] rounded" style={{ background: `repeating-linear-gradient(180deg, ${accent}66 0 2px, transparent 2px 9px)` }} />
        <span className="absolute inset-y-2 right-1.5 w-[2px] rounded" style={{ background: `repeating-linear-gradient(180deg, ${accent}66 0 2px, transparent 2px 9px)` }} />
        {!reduced && <span className="sr-scan pointer-events-none absolute inset-x-0 h-10" style={{ background: `linear-gradient(180deg, transparent, ${accent}22, transparent)` }} />}
        <div className="relative flex flex-col gap-[6px]">
          {Array.from({ length: N }).map((_, i) => {
            const v = load[i]; const hot = v > 80;
            const bar = hot ? "#FFB86B" : accent;
            const h = hist[i]; const mx = 100;
            const spark = h.map((y, k) => `${(k / (HIST - 1)) * 44},${12 - (y / mx) * 11}`).join(" ");
            return (
              <div key={i} className="flex h-[19px] items-center gap-2.5 rounded-md border px-2" style={{ borderColor: "rgba(160,150,230,.12)", background: "rgba(255,255,255,.025)" }}>
                <span className="mono text-[9.5px]" style={{ color: "#8D95BE" }}>u0{i + 1}</span>
                <span className="flex gap-[5px]">
                  {led[i].map((on, j) => {
                    const c = j === 0 ? "#3DDB7A" : j === 1 ? accent : "#FFB86B";
                    return <span key={j} className="h-[5px] w-[5px] rounded-full transition-all duration-150" style={{ background: on ? c : "rgba(160,150,230,.18)", boxShadow: on ? `0 0 3px ${c}, 0 0 10px ${c}, 0 0 16px ${c}88` : "none" }} />;
                  })}
                </span>
                <span className="relative h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: "rgba(160,150,230,.12)" }}>
                  <span className="absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[width,background] duration-[850ms] ease-[cubic-bezier(.16,1,.3,1)]"
                    style={{ width: `${v}%`, background: `linear-gradient(90deg, ${bar}55, ${bar})`, boxShadow: `0 0 10px ${bar}aa` }}>
                    {!reduced && <span className="sr-sheen absolute inset-y-0 w-8" />}
                  </span>
                </span>
                <svg width="44" height="13" className="hidden shrink-0 sm:block"><polyline points={spark} fill="none" stroke={bar} strokeWidth="1" strokeOpacity=".8" /></svg>
                <span className="mono w-[3ch] text-right text-[9.5px] tabular-nums" style={{ color: hot ? "#FFB86B" : "#C2C8EA" }}>{Math.round(v)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .sr-scan{top:-40px;animation:sr-scan 3.2s linear infinite}
        @keyframes sr-scan{to{top:100%}}
        .sr-sheen{left:-2rem;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:sr-sheen 2.2s ease-in-out infinite}
        @keyframes sr-sheen{to{left:100%}}
      `}</style>
    </div>
  );
}
