"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { lenis } from "@/lib/scroll";

/** Boot copy, specified by the brief. */
const LINES = ["> starting server on 127.0.0.1 …", "> engines found: claude · codex · grok", "> all ready"];
const TOTAL = LINES.reduce((n, l) => n + l.length, 0);

// timeline (ms), total <= 2200
const T_TYPE0 = 120, T_TYPE1 = 1250;   // typing window
const T_COLLAPSE_Y = 1450;              // scaleY
const T_COLLAPSE_X = 1600;              // scaleX
const T_POINT = 1760;                   // point flash, booted fires here
const T_FADE = 1900;                    // overlay fade
const T_END = 2200;

type Phase = "boot" | "type" | "collapseY" | "collapseX" | "point" | "fade" | "gone";

export default function Preloader() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [chars, setChars] = useState(0);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const doneRef = useRef(false);

  const unlock = () => {
    lenis?.start();
    document.documentElement.style.removeProperty("overflow");
  };
  const markBooted = () => {
    try { sessionStorage.setItem("booted", "1"); } catch {}
    if (!useStore.getState().booted) useStore.getState().set({ booted: true });
  };

  const finish = useCallback((fast: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    timers.current.forEach(clearTimeout);
    cancelAnimationFrame(raf.current);
    setChars(TOTAL);
    markBooted();
    unlock();
    if (fast) { setPhase("fade"); timers.current = [window.setTimeout(() => setPhase("gone"), 480)]; }
    else setPhase("gone");
  }, []);

  useEffect(() => {
    let already = false;
    try { already = sessionStorage.getItem("booted") === "1"; } catch {}
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (already || reduced) {
      doneRef.current = true;
      markBooted();
      setPhase("gone");
      return;
    }

    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    setPhase("type");
    const t0 = performance.now();
    const typeLoop = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0 - T_TYPE0) / (T_TYPE1 - T_TYPE0)));
      setChars(Math.round(p * TOTAL));
      if (p < 1) raf.current = requestAnimationFrame(typeLoop);
    };
    raf.current = requestAnimationFrame(typeLoop);
    // in case lenis was created after this effect
    const relock = window.setTimeout(() => { if (!doneRef.current) lenis?.stop(); }, 60);

    timers.current = [
      relock,
      window.setTimeout(() => setPhase("collapseY"), T_COLLAPSE_Y),
      window.setTimeout(() => setPhase("collapseX"), T_COLLAPSE_X),
      window.setTimeout(() => { setPhase("point"); markBooted(); }, T_POINT),
      window.setTimeout(() => { setPhase("fade"); unlock(); }, T_FADE),
      window.setTimeout(() => { doneRef.current = true; setPhase("gone"); }, T_END),
    ];
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") finish(true); };
    addEventListener("keydown", key);
    return () => {
      timers.current.forEach(clearTimeout);
      cancelAnimationFrame(raf.current);
      removeEventListener("keydown", key);
      unlock();
    };
  }, [finish]);

  if (phase === "gone") return null;

  // slice typed characters across lines
  let left = chars;
  const shown = LINES.map((l) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; return s; });
  const activeLine = Math.min(LINES.length - 1, shown.findIndex((s, i) => s.length < LINES[i].length) === -1 ? LINES.length - 1 : shown.findIndex((s, i) => s.length < LINES[i].length));
  const typingDone = chars >= TOTAL;

  const termTransform =
    phase === "collapseY" ? "scale(1, .004)" :
    phase === "collapseX" || phase === "point" || phase === "fade" ? "scale(0, .004)" : "scale(1, 1)";

  return (
    <div
      className="pl-hide-nojs fixed inset-0 z-[200] grid place-items-center overflow-hidden"
      style={{ backgroundColor: phase === "fade" ? "rgba(0,0,0,0)" : "#000", transition: "background-color .3s cubic-bezier(.16,1,.3,1)", pointerEvents: phase === "fade" ? "none" : "auto" }}
      onClick={() => finish(true)}
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
    >
      {/* ambient field */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: phase === "type" || phase === "boot" ? 1 : 0, transition: "opacity .3s",
        background: "radial-gradient(40% 35% at 50% 50%, rgba(91,46,224,.16), transparent 70%), radial-gradient(70% 60% at 50% 50%, rgba(31,111,214,.07), transparent 75%)" }} />
      <noscript><style>{`.pl-hide-nojs{display:none}`}</style></noscript>

      {/* terminal */}
      <div
        className="pl-term relative w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-xl border border-[rgba(124,92,255,.32)] bg-[#050612] px-5 py-5 font-mono text-[12.5px] leading-[1.9] text-[#D6DAF5] sm:text-[13.5px]"
        style={{
          transform: termTransform,
          transition: phase === "collapseY"
            ? "transform .15s cubic-bezier(.7,0,.84,0), background .15s"
            : "transform .15s cubic-bezier(.16,1,.3,1)",
          background: phase === "collapseY" || phase === "collapseX" ? "#E9E4FF" : undefined,
        }}
      >
        <div className="mb-3 flex gap-1.5" aria-hidden="true" style={{ opacity: phase === "type" || phase === "boot" ? 1 : 0 }}>
          <span className="h-2 w-2 rounded-full bg-[rgba(169,140,255,.5)]" />
          <span className="h-2 w-2 rounded-full bg-[rgba(169,140,255,.3)]" />
          <span className="h-2 w-2 rounded-full bg-[rgba(169,140,255,.18)]" />
        </div>
        <div className="pl-glow relative" style={{ opacity: phase === "type" || phase === "boot" ? 1 : 0, transition: "opacity .1s" }}>
          {LINES.map((l, i) => (
            <div key={i} className="min-h-[1.9em] whitespace-pre-wrap break-words">
              <span className={i === 2 && shown[i].length === l.length ? "text-[#6FD0FF]" : undefined}>{shown[i]}</span>
              {i === activeLine && (
                <span
                  aria-hidden="true"
                  className={`ml-[1px] inline-block h-[1.1em] w-[.55em] translate-y-[.2em] bg-[#A98CFF] ${typingDone ? "pl-blink" : ""}`}
                />
              )}
            </div>
          ))}
        </div>
        <span className="sr-only">{LINES.join(" ")}</span>
        {/* CRT scanlines + sweeping scan bar */}
        <span aria-hidden="true" className="pl-scanlines pointer-events-none absolute inset-0" />
        <span aria-hidden="true" className="pl-scanbar pointer-events-none absolute inset-x-0 top-0 h-16" />
      </div>

      {/* point of light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{
          opacity: phase === "collapseX" || phase === "point" ? 1 : 0,
          transform: `translate(-50%,-50%) scale(${phase === "point" ? 2.8 : phase === "fade" ? 0.2 : 1})`,
          boxShadow: "0 0 24px 8px #A98CFF, 0 0 70px 24px rgba(111,208,255,.55), 0 0 140px 60px rgba(91,46,224,.35)",
          transition: "transform .22s cubic-bezier(.16,1,.3,1), opacity .35s",
        }}
      />
      {(phase === "point" || phase === "fade") && (
        <>
          <div aria-hidden="true" className="pl-flash pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="pl-ring pointer-events-none absolute left-1/2 top-1/2 h-[120px] w-[120px] rounded-full" />
          <div aria-hidden="true" className="pl-ring pl-ring-2 pointer-events-none absolute left-1/2 top-1/2 h-[120px] w-[120px] rounded-full" />
        </>
      )}

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); finish(true); }}
        className="absolute bottom-6 right-6 rounded-full border border-[rgba(124,92,255,.32)] px-4 py-1.5 font-mono text-[12px] tracking-[.12em] text-[#A2AACE] transition-colors hover:border-[#A98CFF] hover:text-white"
        style={{ opacity: phase === "type" ? 1 : 0, transition: "opacity .2s" }}
      >
        Skip
      </button>
      <style>{`
        .pl-blink{animation:plb .5s steps(1) infinite;box-shadow:0 0 10px #A98CFF}
        .pl-term{box-shadow:0 0 0 1px rgba(124,92,255,.08),0 0 90px -18px rgba(124,92,255,.6),inset 0 0 40px rgba(91,46,224,.12)}
        .pl-glow{text-shadow:0 0 6px rgba(169,140,255,.55),0 0 18px rgba(111,208,255,.22)}
        .pl-scanlines{background:repeating-linear-gradient(180deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);mix-blend-mode:screen}
        .pl-scanbar{background:linear-gradient(180deg,transparent,rgba(111,208,255,.10) 70%,rgba(169,140,255,.22) 96%,transparent);animation:plscan 1.6s cubic-bezier(.45,0,.55,1) infinite}
        @keyframes plscan{from{transform:translateY(-100%)}to{transform:translateY(420%)}}
        .pl-flash{background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.95) 0%,rgba(201,167,255,.55) 12%,rgba(111,208,255,.18) 32%,transparent 60%);animation:plflash .45s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes plflash{0%{opacity:0;transform:scale(.6)}18%{opacity:1}100%{opacity:0;transform:scale(1.4)}}
        .pl-ring{border:1.5px solid rgba(201,230,255,.9);box-shadow:0 0 24px rgba(111,208,255,.7),inset 0 0 24px rgba(169,140,255,.6);transform:translate(-50%,-50%) scale(0);animation:plring .44s cubic-bezier(.16,1,.3,1) forwards}
        .pl-ring-2{border-color:rgba(169,140,255,.7);animation-delay:.07s;animation-duration:.5s}
        @keyframes plring{0%{transform:translate(-50%,-50%) scale(.05);opacity:1}100%{transform:translate(-50%,-50%) scale(14);opacity:0}}
        @keyframes plb{50%{opacity:0}}
      `}</style>
    </div>
  );
}
