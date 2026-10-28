"use client";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { Magnetic } from "@/components/ui/interactions";

const H = site.hero;
const GLYPHS = "!<>-_/[]{}=+*^?#01ABCDEFXZ";
const CHAR_MS = 55;
const L1_WORDS = H.titleLine1.split(" ");
const L1_LEN = H.titleLine1.length;
const L2_WORDS = H.titleLine2.split(" ");
const L2_SPLIT = Math.ceil(L2_WORDS.length / 2);
const L2_LINES = [L2_WORDS.slice(0, L2_SPLIT).join(" "), L2_WORDS.slice(L2_SPLIT).join(" ")];
const SUB_WORDS = H.sub.split(" ");
const SUB_LAST = SUB_WORDS[SUB_WORDS.length - 1];
const SUB_HEAD = SUB_WORDS.slice(0, -1).join(" ");
const TAG_WORDS = H.lockupTag.split(" · ");
const T_L2 = L1_LEN * CHAR_MS + 350;
const T_SUB = T_L2 + 500;
const T_CHIPS = T_SUB + 350;

/** Starts once the preloader reports `booted` (fallback after 3s in case no preloader sets it). */
function useGo() {
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (useStore.getState().booted || matchMedia("(prefers-reduced-motion: reduce)").matches) { setGo(true); return; }
    const unsub = useStore.subscribe((s) => { if (s.booted) setGo(true); });
    const t = setTimeout(() => setGo(true), 3000);
    return () => { unsub(); clearTimeout(t); };
  }, []);
  return go;
}

function Scramble({ text, go, delay }: { text: string; go: boolean; delay: number }) {
  const [chars, setChars] = useState<{ c: string; done: boolean }[]>(() => text.split("").map((c) => ({ c, done: true })));
  useEffect(() => {
    if (!go || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id: ReturnType<typeof setInterval> | undefined; let f = 0; const total = 30;
    const t = setTimeout(() => {
      id = setInterval(() => {
        f++;
        const reveal = Math.floor((f / total) * text.length);
        setChars(text.split("").map((c, i) => (i < reveal ? { c, done: true } : { c: GLYPHS[Math.floor(Math.random() * GLYPHS.length)], done: false })));
        if (f >= total) { clearInterval(id); setChars(text.split("").map((c) => ({ c, done: true }))); }
      }, 45);
    }, delay);
    return () => { clearTimeout(t); if (id) clearInterval(id); };
  }, [go, text, delay]);
  return (
    <span className="relative inline-block">
      <span className="sr-only">{text}</span>
      <span aria-hidden className="grad-word">
        {chars.map((x, i) => <span key={i} className={x.done ? "" : "font-mono"} style={x.done ? undefined : { color: "var(--accent)", WebkitTextFillColor: "var(--accent)" }}>{x.c}</span>)}
      </span>
    </span>
  );
}

function ArenaTicker({ go }: { go: boolean }) {
  const [s, setS] = useState<{ m: number; a: number; b: number; k: number } | null>(null);
  useEffect(() => {
    if (!go) return;
    let m = 2000 + Math.floor(Math.random() * 900), a = 0, b = 0, k = 0;
    setS({ m, a, b, k });
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      k++;
      if (a + b >= 5 || Math.random() < 0.12) { m++; a = 0; b = 0; } else if (Math.random() < 0.5) a++; else b++;
      setS({ m, a, b, k });
    }, 1800);
    return () => clearInterval(id);
  }, [go]);
  return (
    <span aria-hidden className="mono inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: "var(--line-strong)", color: "var(--ink-faint)", background: "color-mix(in oklab, var(--surface-flat) 45%, transparent)" }}>
      <span className="rounded-[4px] px-1 py-[1px] text-[9.5px] font-bold tracking-[.14em]" style={{ background: "color-mix(in oklab, var(--accent) 22%, transparent)", color: "var(--accent)" }}>SIM</span>
      <span key={s?.k ?? -1} className="hero-tick tabular-nums">
        {s ? <>match #{s.m} · agent_a <b style={{ color: "var(--ink)" }}>{s.a}</b> — <b style={{ color: "var(--ink)" }}>{s.b}</b> agent_b</> : "match #···· · agent_a 0 — 0 agent_b"}
      </span>
    </span>
  );
}

const ICONS = [
  "M8 8h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3zM12 4v4M9.5 13.5h1M13.5 13.5h1", // agents
  "M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8M12 3v4M12 17v4M3 12h4M17 12h4", // endpoints
  "M4 5h16v6H4zM4 13h16v6H4zM7.5 8h2M7.5 16h2", // vps
  "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5", // infrastructure
  "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1", // connectors
  "M8 6l-5 6 5 6M16 6l5 6-5 6M13.5 5l-3 14", // model apis
];

function ChipIcon({ i, go, delay }: { i: number; go: boolean; delay: number }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path className="hero-icon" d={ICONS[i]} pathLength={1} strokeDasharray="1 1"
        style={{ strokeDashoffset: go ? 0 : 1, transition: `stroke-dashoffset 1.1s cubic-bezier(.65,0,.35,1) ${delay}ms` }} />
    </svg>
  );
}

function Lockup({ go }: { go: boolean }) {
  const [lit, setLit] = useState(-1);
  useEffect(() => {
    if (!go) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setLit(-2); return; }
    let i = 0; setLit(0);
    const id = setInterval(() => { i = (i + 1) % TAG_WORDS.length; setLit(i); }, 1200);
    return () => clearInterval(id);
  }, [go]);
  return (
    <div className={`hero-fade ${go ? "in" : ""} lg:text-right`} style={{ animationDelay: `${T_CHIPS + 700}ms` }}>
      <div className="font-display text-[22px] font-bold tracking-[-0.02em]" style={{ color: "var(--ink)" }}>{H.lockupName}</div>
      <div className="mono mt-1.5 text-[10.5px] tracking-[.18em] sm:text-[11px] sm:tracking-[.32em]">
        {TAG_WORDS.map((w, i) => {
          const on = lit === i || lit === -2;
          return (
            <span key={w}>
              {i > 0 && <span style={{ color: "var(--ink-faint)", opacity: 0.6 }}> · </span>}
              <span style={{ color: on ? "var(--ink)" : "var(--ink-faint)", textShadow: on ? "0 0 14px var(--accent)" : "none", transition: "color .5s, text-shadow .5s" }}>{w}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

const GUTTER = "max(clamp(16px,4vw,40px),calc((100vw - 1280px)/2 + clamp(16px,4vw,40px)))";

/** Decorative HUD corner brackets framing the globe area (lines only). */
function HudFrame({ go }: { go: boolean }) {
  const c = "color-mix(in oklab, var(--accent) 55%, transparent)";
  const corner = (v: "top" | "bottom", h: "left" | "right", rot: number) => (
    <svg className="absolute" style={{ [v]: 0, [h]: 0, transform: `rotate(${rot}deg)` }} width="34" height="34" viewBox="0 0 34 34" fill="none">
      <path d="M1 22V1h21" stroke={c} strokeWidth="1.2" />
      <path d="M6 11V6h5" stroke={c} strokeWidth="1" opacity=".6" />
    </svg>
  );
  return (
    <div aria-hidden className={`hero-fade pointer-events-none absolute hidden lg:block ${go ? "in" : ""}`}
      style={{ left: "52%", right: GUTTER, top: "17vh", bottom: "15vh", animationDelay: `${T_CHIPS + 400}ms` }}>
      {corner("top", "left", 0)}{corner("top", "right", 90)}{corner("bottom", "right", 180)}{corner("bottom", "left", 270)}
      <span className="absolute left-1/2 top-0 h-2 w-px" style={{ background: c }} />
      <span className="absolute bottom-0 left-1/2 h-2 w-px" style={{ background: c }} />
      <span className="absolute left-0 top-1/2 h-px w-2" style={{ background: c }} />
      <span className="absolute right-0 top-1/2 h-px w-2" style={{ background: c }} />
      <span className="hero-scan absolute inset-x-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)` }} />
    </div>
  );
}

export default function Hero() {
  const go = useGo();
  const set = useStore((s) => s.set);
  let ci = 0;

  const line1 = (overlay: boolean) => L1_WORDS.map((w, wi) => (
    <span key={wi}>
      <span className="inline-block whitespace-nowrap">
        {overlay ? w : w.split("").map((ch) => {
          const d = ci++ * CHAR_MS;
          return <span key={d} className={`hero-ch ${go ? "in" : ""}`} style={{ animationDelay: `${d}ms` }}>{ch}</span>;
        })}
      </span>
      {wi < L1_WORDS.length - 1 && (overlay ? " " : (ci++, " "))}
    </span>
  ));

  return (
    <section id="top" data-chapter="hero" className="relative flex min-h-[100svh] items-center overflow-hidden pb-40 pt-32 lg:pb-32">
      {/* aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="hero-blob" style={{ width: "62vw", height: "62vw", left: "-22vw", top: "-18vw", background: "radial-gradient(closest-side, #5B2EE0, transparent)", animationDuration: "24s" }} />
        <span className="hero-blob" style={{ width: "54vw", height: "54vw", right: "-14vw", bottom: "-26vw", background: "radial-gradient(closest-side, #1F6FD6, transparent)", animationDuration: "30s", animationDelay: "-8s" }} />
        <span className="hero-blob" style={{ width: "30vw", height: "30vw", left: "30vw", top: "-8vw", background: "radial-gradient(closest-side, #C2379E, transparent)", opacity: 0.22, animationDuration: "21s", animationDelay: "-4s" }} />
      </div>
      {/* veil: strong on mobile (text sits over the globe), soft on desktop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden"
        style={{ background: "radial-gradient(130% 75% at 25% 45%, color-mix(in oklab, var(--ground) 78%, transparent) 0%, color-mix(in oklab, var(--ground) 40%, transparent) 55%, transparent 100%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--ground) 60%, transparent) 0%, color-mix(in oklab, var(--ground) 25%, transparent) 38%, transparent 56%)" }} />
      {/* perspective grid floor */}
      <div aria-hidden className="hero-floor pointer-events-none absolute inset-x-0 bottom-0">
        <div className="hero-plane" />
        <span className="hero-horizon" />
      </div>

      <HudFrame go={go} />

      <div className="container-x relative grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="max-w-[680px]">
          <h1 className="h1" aria-label={`${H.titleLine1} — ${H.titleLine2}`}>
            <span aria-hidden className="relative block text-[clamp(46px,6vw,96px)] tracking-[-0.055em]">
              {line1(false)}
              <span className={`hero-sweep absolute inset-0 ${go ? "on" : ""}`} style={{ animationDelay: `${L1_LEN * CHAR_MS + 900}ms` }}>{line1(true)}</span>
            </span>
            <span aria-hidden className="mt-5 block font-display text-[max(0.4em,26px)] font-bold leading-[1.08] tracking-[-0.03em]">
              {L2_LINES.map((l, i) => (
                <span key={i} className="block overflow-hidden pb-[0.12em] -mb-[0.06em]">
                  <span className={`hero-line block ${go ? "in" : ""}`} style={{ transitionDelay: `${T_L2 + i * 140}ms` }}>
                    <span className="hero-shimmer">{l}</span>
                  </span>
                </span>
              ))}
            </span>
          </h1>

          <div className={`hero-fade mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 ${go ? "in" : ""}`} style={{ animationDelay: `${T_SUB}ms` }}>
            <p className="font-display text-[clamp(20px,2vw,28px)] font-semibold tracking-[-0.02em]" style={{ color: "var(--ink)" }}>
              {SUB_HEAD} <Scramble text={SUB_LAST} go={go} delay={T_SUB + 150} />
            </p>
            <ArenaTicker go={go} />
          </div>

          <div className={`hero-fade mt-9 flex flex-wrap items-center gap-3 ${go ? "in" : ""}`} style={{ animationDelay: `${T_SUB + 200}ms` }}>
            <Magnetic strength={6}>
              <a href="#pricing" className="btn-primary hero-cta">
                {site.pricing.title}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            </Magnetic>
            <a href={site.cta.button.href} className="btn-ghost">{site.cta.button.label}</a>
          </div>

          <ul className="mt-10 flex max-w-[620px] flex-wrap gap-2.5" aria-label="Products">
            {H.chips.map((c, i) => (
              <li key={c} tabIndex={0} className={`chip hero-chip ${go ? "in" : ""}`} style={{ animationDelay: `${T_CHIPS + i * 90}ms` }}
                onMouseEnter={() => set({ hoverChip: i })} onMouseLeave={() => set({ hoverChip: null })}
                onFocus={() => set({ hoverChip: i })} onBlur={() => set({ hoverChip: null })}>
                <span className="chip-icon"><ChipIcon i={i} go={go} delay={T_CHIPS + i * 90 + 200} /></span>
                {c}
              </li>
            ))}
          </ul>

          <div className="mt-12 lg:hidden"><Lockup go={go} /></div>
        </div>
        <div aria-hidden className="hidden lg:block" />
      </div>

      <div className="absolute bottom-[calc(15vh+40px)] hidden lg:block" style={{ right: `calc(${GUTTER} + 22px)` }}>
        <Lockup go={go} />
      </div>

      <p className="sr-only">{H.sceneAlt}</p>

      <a href="#features" className={`hero-fade absolute inset-x-0 bottom-7 z-[1] mx-auto flex w-max items-center gap-3 ${go ? "in" : ""}`}
        style={{ animationDelay: `${T_CHIPS + 900}ms` }}>
        <span aria-hidden className="relative block h-[34px] w-[22px] rounded-full border-[1.5px]" style={{ borderColor: "var(--line-strong)" }}>
          <span className="hero-wheel absolute left-1/2 top-[7px] h-[7px] w-[3px] -translate-x-1/2 rounded-full" style={{ background: "var(--accent)" }} />
        </span>
        <span className="mono text-[11px] uppercase tracking-[.22em]" style={{ color: "var(--ink-faint)" }}>Scroll to enter the network</span>
      </a>

      <style>{`
        .hero-blob{position:absolute;border-radius:999px;filter:blur(70px);opacity:.38;mix-blend-mode:screen;animation:hero-drift 26s ease-in-out infinite alternate}
        :root[data-theme="light"] .hero-blob{mix-blend-mode:multiply;opacity:.12}
        @keyframes hero-drift{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(6vw,4vh,0) scale(1.12)}100%{transform:translate3d(-4vw,-3vh,0) scale(.94)}}
        .hero-floor{height:34vh;perspective:420px;perspective-origin:50% 0%;-webkit-mask-image:linear-gradient(to top,#000 10%,rgba(0,0,0,.6) 45%,transparent 92%);mask-image:linear-gradient(to top,#000 10%,rgba(0,0,0,.6) 45%,transparent 92%)}
        .hero-plane{position:absolute;left:-60%;right:-60%;top:0;height:220%;transform-origin:50% 0;transform:rotateX(64deg);
          background-image:linear-gradient(color-mix(in oklab,var(--accent) 34%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in oklab,var(--accent) 26%,transparent) 1px,transparent 1px);
          background-size:64px 64px;animation:hero-flow 2.6s linear infinite}
        @keyframes hero-flow{to{background-position:0 -64px}}
        .hero-horizon{position:absolute;left:8%;right:8%;top:0;height:1px;background:linear-gradient(90deg,transparent,#A98CFF,#6FD0FF,transparent);box-shadow:0 0 24px 4px rgba(124,92,255,.45);opacity:.55}
        .hero-ch{display:inline-block;opacity:0;filter:blur(14px);transform:translateY(.22em) scale(1.06);will-change:transform,filter,opacity;
          text-shadow:0 0 42px color-mix(in oklab,var(--accent) 45%,transparent),0 0 2px color-mix(in oklab,var(--ink) 40%,transparent)}
        .hero-ch.in{animation:hero-ch .95s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes hero-ch{to{opacity:1;filter:blur(0);transform:none}}
        .hero-sweep{pointer-events:none;color:transparent;-webkit-background-clip:text;background-clip:text;opacity:0;
          background-image:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.95) 49%,#E4D8FF 51%,transparent 62%);background-size:260% 100%;background-position:130% 0;background-repeat:no-repeat}
        :root[data-theme="light"] .hero-sweep{background-image:linear-gradient(105deg,transparent 38%,#8B6BFF 49%,#6FD0FF 51%,transparent 62%)}
        .hero-sweep.on{opacity:1;animation:hero-sweep 6s cubic-bezier(.45,0,.2,1) infinite}
        @keyframes hero-sweep{0%{background-position:130% 0}38%,100%{background-position:-30% 0}}
        .hero-shimmer{background:linear-gradient(95deg,#C9A7FF 0%,#6FD0FF 30%,#E07BFF 55%,#C9A7FF 80%,#6FD0FF 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:hero-shim 9s ease-in-out infinite alternate}
        :root[data-theme="light"] .hero-shimmer{background-image:linear-gradient(95deg,#5B2EE0,#1F6FD6 40%,#9B2FC9 70%,#5B2EE0)}
        @keyframes hero-shim{to{background-position:100% 0}}
        .hero-line{transform:translateY(110%);transition:transform 1.1s cubic-bezier(.16,1,.3,1)}
        .hero-line.in{transform:none}
        .hero-fade{opacity:0}
        .hero-fade.in{animation:hero-fade .9s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes hero-fade{from{opacity:0;translate:0 14px}to{opacity:1;translate:0 0}}
        .hero-cta{position:relative;overflow:hidden}
        .hero-cta::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.35) 50%,transparent 65%);transform:translateX(-120%);animation:hero-cta 5s ease-in-out 3s infinite}
        @keyframes hero-cta{0%,70%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
        .hero-chip{opacity:0;cursor:default;border:1px solid transparent;
          background:linear-gradient(var(--chip-bg),var(--chip-bg)) padding-box,linear-gradient(120deg,color-mix(in oklab,#C9A7FF 60%,transparent),color-mix(in oklab,#6FD0FF 18%,transparent) 50%,color-mix(in oklab,#C9A7FF 40%,transparent)) border-box;
          backdrop-filter:blur(10px);transition:box-shadow .35s,translate .35s cubic-bezier(.16,1,.3,1),color .25s}
        .hero-chip.in{animation:hero-chip-in .7s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes hero-chip-in{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
        .hero-chip:hover,.hero-chip:focus-visible{color:var(--ink);translate:0 -3px;
          background:linear-gradient(var(--chip-bg),var(--chip-bg)) padding-box,linear-gradient(120deg,#C9A7FF,#6FD0FF) border-box;
          box-shadow:0 10px 32px -8px color-mix(in oklab,var(--accent) 70%,transparent),0 0 0 4px color-mix(in oklab,var(--accent) 10%,transparent)}
        .hero-chip:hover .chip-icon{background:color-mix(in oklab,var(--accent) 30%,transparent)}
        .hero-chip:hover .hero-icon{animation:hero-redraw .8s cubic-bezier(.65,0,.35,1)}
        @keyframes hero-redraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
        .hero-tick{animation:hero-tick .45s cubic-bezier(.16,1,.3,1)}
        @keyframes hero-tick{from{opacity:0;filter:blur(3px)}to{opacity:1;filter:blur(0)}}
        .hero-scan{top:0;animation:hero-scan 7s ease-in-out infinite;opacity:.6}
        @keyframes hero-scan{0%{top:0;opacity:0}10%{opacity:.6}90%{opacity:.6}100%{top:100%;opacity:0}}
        .hero-wheel{animation:hero-wheel 1.8s cubic-bezier(.65,0,.35,1) infinite}
        @keyframes hero-wheel{0%{opacity:0;transform:translate(-50%,0)}30%{opacity:1}70%{opacity:1;transform:translate(-50%,9px)}100%{opacity:0;transform:translate(-50%,12px)}}
        @media (prefers-reduced-motion:reduce){.hero-ch,.hero-chip,.hero-fade{animation-delay:0s!important}.hero-line,.hero-icon{transition-delay:0s!important}.hero-sweep.on,.hero-plane,.hero-blob,.hero-scan{animation:none!important}.hero-sweep{display:none}}
      `}</style>
    </section>
  );
}
