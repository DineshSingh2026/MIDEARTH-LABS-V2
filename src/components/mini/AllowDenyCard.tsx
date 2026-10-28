"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type S = "idle" | "allow" | "deny";

/** Step 04 · Interactive approval card. Allow → green pulse + "proceeds"; Deny → red shake + "blocked". Resets after 2s.
 *  The key field is write-only: it only ever shows that a key is configured. */
export default function AllowDenyCard({ reduced = false }: { reduced?: boolean }) {
  const [s, setS] = useState<S>("idle");
  useEffect(() => {
    if (s === "idle") return;
    const t = setTimeout(() => setS("idle"), 2000);
    return () => clearTimeout(t);
  }, [s]);

  const col = s === "allow" ? "#28C840" : s === "deny" ? "#FF5F57" : "var(--line-strong)";
  const status = s === "allow" ? "proceeds" : s === "deny" ? "blocked" : "Allow or Deny";

  return (
    <div className="flex w-full flex-col gap-4">
      <motion.div
        animate={s === "deny" && !reduced ? { x: [0, -10, 9, -7, 5, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl border p-5"
        style={{ borderColor: col, background: "color-mix(in oklab, var(--surface-flat) 60%, transparent)", transition: "border-color .3s" }}
      >
        <AnimatePresence>
          {s === "allow" && !reduced && (
            <motion.span key="pulse" aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl"
              initial={{ opacity: 0.7, scale: 1 }} animate={{ opacity: 0, scale: 1.06 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}
              style={{ boxShadow: "0 0 0 2px #28C840, 0 0 40px #28C840" }} />
          )}
        </AnimatePresence>
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "color-mix(in oklab, #F5C76B 18%, transparent)", color: "#F5C76B" }} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L22 20H2L12 3zM12 10v4M12 17h.01" /></svg>
          </span>
          <span className="whitespace-nowrap text-[16px] font-bold" style={{ color: "var(--ink)" }}>Risky action</span>
          <span className="mono ml-auto whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px]" aria-live="polite" style={{ borderColor: col, color: s === "idle" ? "var(--ink-faint)" : col, transition: "all .3s" }}>{status}</span>
        </div>
        <div className="mt-4 flex flex-col gap-1.5" aria-hidden>
          <span className="h-[6px] w-[78%] rounded-full" style={{ background: "var(--line-strong)" }} />
          <span className="h-[6px] w-[56%] rounded-full" style={{ background: "var(--line)" }} />
        </div>
        <div className="mt-5 flex gap-2.5">
          <button type="button" aria-label="Allow the risky action" onClick={() => setS("allow")} disabled={s !== "idle"}
            className="flex-1 rounded-full px-4 py-2.5 text-[14px] font-bold transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: "#28C840", color: "#04140A", boxShadow: s === "allow" ? "0 0 24px #28C84088" : "none" }}>
            Allow
          </button>
          <button type="button" aria-label="Deny the risky action" onClick={() => setS("deny")} disabled={s !== "idle"}
            className="flex-1 rounded-full border px-4 py-2.5 text-[14px] font-bold transition-all hover:border-[#FF5F57] disabled:opacity-60"
            style={{ borderColor: s === "deny" ? "#FF5F57" : "var(--line-strong)", color: s === "deny" ? "#FF5F57" : "var(--ink)" }}>
            Deny
          </button>
        </div>
      </motion.div>

      <div className="group flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: "var(--line)", background: "color-mix(in oklab, var(--surface-flat) 45%, transparent)" }}
        aria-label="Key configured. The value is never shown." role="group">
        <svg width="18" height="20" viewBox="0 0 18 20" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M4.5 9V6a4.5 4.5 0 0 1 9 0v3" className="transition-transform duration-200 ease-[cubic-bezier(.3,1.6,.5,1)] [transform:translateY(-3px)] group-hover:[transform:translateY(0)]" />
          <rect x="2" y="9" width="14" height="10" rx="2.5" fill="color-mix(in oklab, var(--accent) 14%, transparent)" />
        </svg>
        <span className="mono select-none text-[15px] tracking-[.2em]" style={{ color: "var(--ink-soft)" }} aria-hidden>••••••••</span>
        <span className="mono ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: "#28C840" }} aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#28C840" }} /> configured
        </span>
      </div>
    </div>
  );
}
