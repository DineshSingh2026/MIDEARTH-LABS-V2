"use client";
import { motion, AnimatePresence } from "motion/react";
import ChatStream, { useTimeline } from "./ChatStream";
import AllowDenyCard from "./AllowDenyCard";

export type HowArtKind = "local" | "engines" | "stream" | "approve";

const ADDR = "127.0.0.1";
const ROWS = ["transcripts/", "keys/", "events/"];
const LOCAL_T = [...ADDR.split("").map((_, i) => 350 + i * 95), 1500, 1900, 2150, 2400];

function Folder({ c = "var(--accent)" }: { c?: string }) {
  return <svg width="15" height="13" viewBox="0 0 24 20" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round"><path d="M2 4a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z" /></svg>;
}

function Local({ active, reduced }: { active: boolean; reduced: boolean }) {
  const n = useTimeline(active, LOCAL_T, reduced);
  const typed = ADDR.slice(0, Math.min(n, ADDR.length));
  const pathOn = n > ADDR.length;
  const rows = Math.max(0, n - ADDR.length - 1);
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border" style={{ borderColor: "var(--line-strong)", background: "color-mix(in oklab, var(--surface-flat) 55%, transparent)" }} aria-hidden>
      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
        <span className="flex gap-1.5">{["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}</span>
        <span className="mono flex h-7 flex-1 items-center gap-2 rounded-full border px-3 text-[12px]" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
          <svg width="10" height="12" viewBox="0 0 18 20" fill="none" stroke="#28C840" strokeWidth="2"><path d="M4.5 9V6a4.5 4.5 0 0 1 9 0v3" /><rect x="2" y="9" width="14" height="10" rx="2.5" /></svg>
          {typed}
          <span className="inline-block h-3.5 w-[1.5px]" style={{ background: "var(--accent)", opacity: n < ADDR.length ? 1 : 0 }} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <motion.div initial={false} animate={{ opacity: pathOn ? 1 : 0, x: pathOn ? 0 : -8 }} transition={{ duration: 0.4 }} className="mono flex items-center gap-2 text-[13px]" style={{ color: "var(--ink)" }}>
          <Folder /> ~/.midearthlabs
        </motion.div>
        <div className="ml-[7px] flex flex-col border-l pl-4" style={{ borderColor: "var(--line-strong)" }}>
          {ROWS.map((r, i) => (
            <motion.div key={r} initial={false} animate={{ opacity: i < rows ? 1 : 0, y: i < rows ? 0 : -12 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="mono flex items-center gap-2.5 border-b py-2.5 text-[12.5px]" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
              <Folder c="#6FD0FF" /> {r}
              <span className="ml-auto h-[5px] rounded-full" style={{ width: `${[38, 22, 30][i]}%`, background: "var(--line-strong)" }} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ENGINES = ["claude", "codex", "grok"];
const ENG_T = [300, 900, 1100, 1700, 1900, 2500, 2900];

function Engines({ active, reduced }: { active: boolean; reduced: boolean }) {
  const n = useTimeline(active, ENG_T, reduced);
  return (
    <div className="flex h-full w-full flex-col justify-center gap-4" aria-hidden>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ENGINES.map((e, i) => {
          const cmd = n >= 1 + i * 2, ready = n >= 2 + i * 2;
          const len = e.length + 2;
          return (
            <div key={e} className="overflow-hidden rounded-xl border" style={{ borderColor: ready ? "color-mix(in oklab, #28C840 55%, transparent)" : "var(--line-strong)", background: "color-mix(in oklab, var(--surface-flat) 60%, transparent)", transition: "border-color .4s" }}>
              <div className="mono flex items-center gap-2 border-b px-3 py-2 text-[11px]" style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}>
                <span className="h-2 w-2 rounded-full transition-all duration-300" style={{ background: ready ? "#28C840" : cmd ? "#FEBC2E" : "var(--line-strong)", boxShadow: ready ? "0 0 8px #28C840" : "none" }} />
                {e}
              </div>
              <div className="mono flex min-h-[64px] flex-col gap-1 px-3 py-2.5 text-[12px]">
                {cmd && (
                  <span style={{ color: "var(--ink-soft)" }}>
                    <span style={{ color: "var(--accent)" }}>$</span>{" "}
                    <span className="inline-block overflow-hidden whitespace-nowrap align-bottom" style={{ width: `${len - 2}ch`, animation: reduced ? "none" : `ha-type .45s steps(${len - 2}) both` }}>{e}</span>
                  </span>
                )}
                {ready && <motion.span initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ color: "#28C840" }}>● ready</motion.span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center">
        <motion.span initial={false} animate={{ opacity: n >= 7 ? 1 : 0, scale: n >= 7 ? 1 : 0.9 }} className="mono inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px]"
          style={{ borderColor: "#28C840", color: "#28C840", background: "color-mix(in oklab, #28C840 10%, transparent)" }}>
          ✓ All ready
        </motion.span>
      </div>
      <style>{`@keyframes ha-type{from{width:0}}`}</style>
    </div>
  );
}

function ArtBody({ art, active, reduced }: { art: HowArtKind; active: boolean; reduced: boolean }) {
  if (art === "local") return <Local active={active} reduced={reduced} />;
  if (art === "engines") return <Engines active={active} reduced={reduced} />;
  if (art === "stream") return <div className="h-full w-full rounded-2xl border p-5" style={{ borderColor: "var(--line-strong)", background: "color-mix(in oklab, var(--surface-flat) 55%, transparent)" }}><ChatStream active={active} reduced={reduced} /></div>;
  return <div className="flex h-full w-full items-center"><AllowDenyCard reduced={reduced} /></div>;
}

/** Step art for How It Works. `crossfade` wraps it in AnimatePresence keyed by art (desktop sticky panel). */
export default function HowArt({ art, active, reduced, crossfade = false }: { art: HowArtKind; active: boolean; reduced: boolean; crossfade?: boolean }) {
  if (!crossfade) return <div className="h-full w-full"><ArtBody art={art} active={active} reduced={reduced} /></div>;
  return (
    <div className="relative h-full w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={art} className="absolute inset-0"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -18, filter: "blur(8px)" }}
          transition={{ duration: reduced ? 0.15 : 0.45, ease: [0.16, 1, 0.3, 1] }}>
          <ArtBody art={art} active={active} reduced={reduced} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
