"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/** Advances 0..times.length as each timestamp (ms) passes while `active`. Reduced motion jumps to the end. */
export function useTimeline(active: boolean, times: readonly number[], reduced: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced) { setN(times.length); return; }
    setN(0);
    if (!active) return;
    const ids = times.map((t, i) => setTimeout(() => setN(i + 1), t));
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced]);
  return n;
}

const TEXT = "watch an agent work in the conversation";
const TOKENS = TEXT.split(" ");
const T0 = 350, DT = 150;
const TIMES = [
  ...TOKENS.map((_, i) => T0 + i * DT),
  T0 + TOKENS.length * DT + 250, // tool row
  T0 + TOKENS.length * DT + 750, // expand
  T0 + TOKENS.length * DT + 1400, // spinner crossed + stream chip
];

/** Step 03 · An agent message streams token by token; a tool-call row expands; the spinner gets crossed out. */
export default function ChatStream({ active, reduced }: { active: boolean; reduced: boolean }) {
  const n = useTimeline(active, TIMES, reduced);
  const k = TOKENS.length;
  const shown = Math.min(n, k);
  const row = n > k, open = n > k + 1, done = n > k + 2;

  return (
    <div className="flex h-full w-full flex-col gap-3" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "var(--grad-cta)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M8 8h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3zM12 4v4M9.5 13.5h1M13.5 13.5h1" /></svg>
          </span>
          <span className="text-[14px] font-bold" style={{ color: "var(--ink)" }}>agent</span>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#28C840", boxShadow: "0 0 8px #28C840" }} />
        </div>
        {/* spinner, crossed out */}
        <span className="relative grid h-8 w-8 place-items-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round"
            style={{ animation: done || reduced ? "none" : "spin-r 1s linear infinite", opacity: done ? 0.5 : 1, transition: "opacity .3s" }}>
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
          <svg className="absolute inset-0" viewBox="0 0 32 32" fill="none">
            <path d="M6 26L26 6" stroke="#FF5F57" strokeWidth="2.2" strokeLinecap="round" pathLength={1} strokeDasharray="1 1"
              style={{ strokeDashoffset: done ? 0 : 1, transition: reduced ? "none" : "stroke-dashoffset .4s cubic-bezier(.65,0,.35,1)" }} />
          </svg>
          <style>{`@keyframes spin-r{to{transform:rotate(360deg)}}@keyframes cs-blink{50%{opacity:0}}`}</style>
        </span>
      </div>

      <div className="max-w-[92%] rounded-2xl rounded-tl-md border px-4 py-3 text-[15px] leading-relaxed" style={{ borderColor: "var(--line)", background: "color-mix(in oklab, var(--accent) 8%, transparent)", color: "var(--ink-soft)" }}>
        {TOKENS.map((t, i) => (
          <span key={i} className="inline-block transition-all duration-300" style={{ opacity: i < shown ? 1 : 0, filter: i < shown ? "blur(0)" : "blur(4px)", transform: i < shown ? "none" : "translateY(3px)" }}>
            {t}{i < k - 1 ? " " : ""}
          </span>
        ))}
        <span className="ml-0.5 inline-block h-[1em] w-[2px] align-[-2px]" style={{ background: "var(--accent)", opacity: shown < k ? 1 : 0, animation: "cs-blink 1s steps(1) infinite" }} />
      </div>

      <AnimatePresence>
        {row && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
            className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line-strong)", background: "color-mix(in oklab, var(--surface-flat) 55%, transparent)" }}>
            <div className="mono flex items-center gap-2 px-3 py-2 text-[12px]" style={{ color: "var(--ink-soft)" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .3s" }}><path d="M3 1.5L7 5L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
              <span>tool_call · read_file</span>
              <span className="ml-auto" style={{ color: open ? "#28C840" : "var(--ink-faint)" }}>{open ? "✓" : "…"}</span>
            </div>
            <motion.div initial={false} animate={{ height: open ? "auto" : 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
              <div className="flex flex-col gap-1.5 border-t px-3 py-2.5" style={{ borderColor: "var(--line)" }}>
                {[72, 54, 64].map((w, i) => <span key={i} className="h-[5px] rounded-full" style={{ width: `${w}%`, background: "var(--line-strong)" }} />)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mono mt-auto flex items-center gap-2 text-[11px] transition-opacity duration-500" style={{ opacity: done ? 1 : 0, color: "var(--ink-faint)" }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#6FD0FF", boxShadow: "0 0 8px #6FD0FF" }} />
        one event stream
      </div>
    </div>
  );
}
