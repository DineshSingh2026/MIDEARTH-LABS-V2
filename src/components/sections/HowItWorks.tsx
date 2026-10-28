"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { SectionHead } from "@/components/ui/Reveal";
import HowArt, { HowArtKind } from "@/components/mini/HowArt";

gsap.registerPlugin(ScrollTrigger);

const HW = site.howItWorks;
const STEPS = HW.steps;
const STEP_VH = 80;

function ArtFrame({ n, art, children }: { n: string; art: string; children: React.ReactNode }) {
  const idx = STEPS.findIndex((s) => s.n === n);
  return (
    <div className="hw-frame relative flex h-full w-full flex-col p-4 sm:p-6">
      <span aria-hidden className="hw-topglow" />
      <div className="mono relative mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[.2em]" style={{ color: "var(--ink-faint)" }} aria-hidden>
        <span style={{ color: "var(--accent)" }}>{n}</span><span className="h-px w-6" style={{ background: "var(--line-strong)" }} />
        <span key={art} className="hw-label">{art}</span>
        <span className="ml-auto flex gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className="h-[3px] rounded-full transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ width: i === idx ? 22 : 8, background: i <= idx ? "linear-gradient(90deg,#C9A7FF,#6FD0FF)" : "var(--line-strong)", boxShadow: i === idx ? "0 0 10px #A98CFF" : "none" }} />
          ))}
        </span>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

/** Mobile: a step with its art below, played when it enters the viewport. */
function MobileStep({ i, reduced }: { i: number; reduced: boolean }) {
  const s = STEPS[i];
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const set = useStore((st) => st.set);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (e.isIntersecting) set({ howStep: i });
    }, { threshold: 0.35 });
    io.observe(el); return () => io.disconnect();
  }, [i, set]);
  return (
    <div ref={ref} className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: "var(--grad-cta)" }}>{s.n}</span>
        <div>
          <h3 className="font-display text-[22px] font-bold tracking-[-0.02em]" style={{ color: "var(--ink)" }}>{s.title}</h3>
          <p className="mt-2 text-[15px] leading-[1.65]" style={{ color: "var(--ink-muted)" }}>{s.body}</p>
        </div>
      </div>
      <div className={s.art === "approve" ? "" : "h-[340px]"}>
        <ArtFrame n={s.n} art={s.art}>
          <HowArt art={s.art as HowArtKind} active={inView} reduced={reduced} />
        </ArtFrame>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const reduced = useReducedMotion();
  const set = useStore((s) => s.set);
  const [step, setStep] = useState(0);
  const [panelOn, setPanelOn] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const markers = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    let io: IntersectionObserver | null = null; let st: ScrollTrigger | null = null; let vis: IntersectionObserver | null = null;
    const setup = () => {
      io?.disconnect(); st?.kill(); vis?.disconnect(); io = st = vis = null;
      if (!mq.matches) return;
      io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = Number((e.target as HTMLElement).dataset.step);
          setStep(i);
          if (useStore.getState().howStep !== i) set({ howStep: i });
        });
      }, { rootMargin: "-50% 0px -50% 0px" });
      markers.current.forEach((m) => m && io!.observe(m));
      vis = new IntersectionObserver(([e]) => setPanelOn(e.isIntersecting), { threshold: 0 });
      if (colRef.current) vis.observe(colRef.current);
      if (colRef.current) {
        st = ScrollTrigger.create({
          trigger: colRef.current, start: "top 50%", end: "bottom 50%",
          onUpdate: (self) => { if (lineRef.current) lineRef.current.style.transform = `scaleY(${self.progress})`; },
        });
      }
    };
    setup();
    mq.addEventListener("change", setup);
    return () => { mq.removeEventListener("change", setup); io?.disconnect(); st?.kill(); vis?.disconnect(); };
  }, [set]);

  const cur = STEPS[step];

  return (
    <section id="how" data-chapter="how" className="section">
      <div className="container-x">
        <SectionHead eyebrow={HW.eyebrow} title={HW.title} lede={HW.lede} />

        {/* desktop: sticky steps + sticky art panel, each step gets ~80vh of scroll */}
        <div className="relative mt-16 hidden grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-14 lg:grid xl:gap-20">
          <div ref={colRef} className="relative" style={{ height: `${STEPS.length * STEP_VH}vh` }}>
            {STEPS.map((_, i) => (
              <div key={i} ref={(el) => { markers.current[i] = el; }} data-step={i} aria-hidden
                className="pointer-events-none absolute inset-x-0" style={{ top: `${i * STEP_VH}vh`, height: `${STEP_VH}vh` }} />
            ))}
            <div className="sticky top-[20vh]">
              <span aria-hidden className="pointer-events-none absolute -inset-x-16 -inset-y-12 -z-10" style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--ground) 82%, transparent), color-mix(in oklab, var(--ground) 50%, transparent) 60%, transparent)" }} />
              {/* progress line */}
              <span aria-hidden className="absolute bottom-5 left-[19px] top-5 w-px" style={{ background: "var(--line-strong)" }}>
                <span ref={lineRef} className="absolute inset-0 origin-top" style={{ background: "linear-gradient(180deg,#C9A7FF,#6FD0FF)", transform: "scaleY(0)", boxShadow: "0 0 10px #A98CFF" }} />
              </span>
              <ol className="relative flex flex-col gap-9">
              {STEPS.map((s, i) => {
                const on = i === step, past = i < step;
                return (
                  <li key={s.n} className="relative flex gap-6 transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
                    style={{ opacity: on ? 1 : 0.35, transform: on ? "translateX(6px)" : "none", filter: on || reduced ? "none" : "saturate(.6)" }} aria-current={on ? "step" : undefined}>
                    <span className="font-display relative z-[1] grid h-10 w-10 shrink-0 place-items-center rounded-full border text-[14px] font-bold transition-all duration-500"
                      style={{
                        background: on || past ? "var(--grad-cta)" : "var(--surface-flat)",
                        borderColor: on ? "transparent" : "var(--line-strong)",
                        color: on || past ? "#fff" : "var(--ink-faint)",
                        boxShadow: on ? "0 0 0 6px color-mix(in oklab, var(--accent) 18%, transparent), 0 8px 24px rgba(70,46,200,.45)" : "none",
                      }}>{s.n}</span>
                    <div className="pt-1.5">
                      <h3 className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] xl:text-[24px]" style={{ color: "var(--ink)" }}>{s.title}</h3>
                      <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.65]" style={{ color: "var(--ink-muted)" }}>{s.body}</p>
                    </div>
                  </li>
                );
              })}
              </ol>
            </div>
          </div>
          <div className="relative">
            <div className="sticky top-[20vh] h-[min(60vh,520px)] min-h-[420px]">
              <ArtFrame n={cur.n} art={cur.art}>
                <HowArt art={cur.art as HowArtKind} active={panelOn} reduced={reduced} crossfade />
              </ArtFrame>
            </div>
          </div>
        </div>

        {/* mobile / tablet: stacked */}
        <div className="mt-14 flex flex-col gap-16 lg:hidden">
          {STEPS.map((_, i) => <MobileStep key={i} i={i} reduced={reduced} />)}
        </div>
      </div>
      <style>{`
        .hw-frame{border-radius:26px;isolation:isolate;
          background:linear-gradient(180deg,color-mix(in oklab,var(--surface-flat) 88%,transparent),color-mix(in oklab,var(--surface-flat) 80%,transparent));
          backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);
          border:1px solid color-mix(in oklab,var(--accent) 28%,transparent);
          box-shadow:0 40px 100px -40px rgba(91,46,224,.55),0 30px 80px -30px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.05)}
        .hw-frame::after{content:"";position:absolute;inset:0;border-radius:inherit;z-index:-1;pointer-events:none;
          background:radial-gradient(70% 45% at 50% 0%,color-mix(in oklab,var(--accent) 16%,transparent),transparent 70%),radial-gradient(60% 40% at 100% 100%,rgba(111,208,255,.08),transparent 70%)}
        .hw-topglow{position:absolute;left:14%;right:14%;top:-1px;height:1px;background:linear-gradient(90deg,transparent,#C9A7FF,#6FD0FF,transparent);box-shadow:0 0 18px 2px rgba(169,140,255,.6)}
        .hw-label{animation:hw-label .6s cubic-bezier(.16,1,.3,1)}
        @keyframes hw-label{from{opacity:0;transform:translateY(6px);filter:blur(4px)}}
        :root[data-theme="light"] .hw-frame{--ok:#16A34A;
          background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(250,248,255,.85));border-color:rgba(91,46,224,.18);
          box-shadow:0 40px 90px -40px rgba(91,46,224,.3),0 12px 30px -18px rgba(91,46,224,.16),inset 0 1px 0 #fff}
        :root[data-theme="light"] .hw-frame::after{background:radial-gradient(70% 45% at 50% 0%,rgba(91,46,224,.07),transparent 70%),radial-gradient(60% 40% at 100% 100%,rgba(31,111,214,.05),transparent 70%)}
        :root[data-theme="light"] .hw-topglow{background:linear-gradient(90deg,transparent,#8B6BFF,#1F6FD6,transparent);box-shadow:0 0 12px 1px rgba(91,46,224,.3)}
        :root[data-theme="light"] .ha-panel{background:#FFFFFF!important;box-shadow:0 12px 30px -18px rgba(91,46,224,.32),0 1px 2px rgba(91,46,224,.06)}
      `}</style>
    </section>
  );
}
