"use client";
import { CSSProperties, ComponentType, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { SectionHead } from "@/components/ui/Reveal";
import { spotHandlers } from "@/components/ui/interactions";
import ArenaSim from "@/components/mini/ArenaSim";
import EndpointPulse from "@/components/mini/EndpointPulse";
import ServerRack from "@/components/mini/ServerRack";
import RuntimeRing from "@/components/mini/RuntimeRing";
import ConnectorThreads from "@/components/mini/ConnectorThreads";
import ModelRouter from "@/components/mini/ModelRouter";

gsap.registerPlugin(ScrollTrigger);

const P = site.platform;
const LAST = P.cards[P.cards.length - 1].n;
export const CARD_ACCENTS = ["#A98CFF", "#6FD0FF", "#4F8BFF", "#E07BFF", "#3DDBB4", "#FFB86B"];
type VisualProps = { running: boolean; reduced: boolean; accent: string };
const VISUALS: ComponentType<VisualProps>[] = [ArenaSim, EndpointPulse, ServerRack, RuntimeRing, ConnectorThreads, ModelRouter];
const DESKTOP = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
const STACKED = "(max-width: 1023px), (prefers-reduced-motion: reduce)";

function Card({ i, active, reduced }: { i: number; active: boolean; reduced: boolean }) {
  const c = P.cards[i];
  const accent = CARD_ACCENTS[i];
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el); return () => io.disconnect();
  }, []);
  const V = VISUALS[i];
  return (
    <article ref={ref} data-pf-card={i} {...spotHandlers()}
      className={`pf-card spot conic-border flex flex-col p-6 sm:p-7 ${active ? "is-on" : ""}`}
      style={{ "--ac": accent } as CSSProperties}>
      <span aria-hidden className="pf-topglow" />
      <span aria-hidden className="pf-radial" />
      <div className="relative flex items-start justify-between">
        <span className="pf-num relative font-display" aria-hidden>
          <span className="pf-num-o">{c.n}</span>
          <span className="pf-num-f" style={{ clipPath: active ? "inset(0 0 0 0)" : "inset(100% 0 0 0)" }}>{c.n}</span>
        </span>
        <span className="mono mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[.2em]" style={{ color: active ? accent : "var(--ink-faint)", transition: "color .5s" }} aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent, boxShadow: active ? `0 0 10px ${accent}` : "none", opacity: active ? 1 : 0.5 }} />
          {c.n} / {LAST}
        </span>
      </div>
      <div className="pf-vis relative mt-3 h-[188px] overflow-hidden rounded-2xl" aria-hidden>
        <V running={inView && active} reduced={reduced} accent={accent} />
      </div>
      <h3 className="relative mt-6 font-display text-[22px] font-bold tracking-[-0.02em] sm:text-[25px]" style={{ color: "var(--ink)" }}>{c.title}</h3>
      <p className="relative mt-2.5 text-[14.5px] leading-[1.68]" style={{ color: "var(--ink-muted)" }}>{c.body}</p>
    </article>
  );
}

export default function Platform() {
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const set = useStore((s) => s.set);

  useEffect(() => {
    const apply = (i: number) => {
      setActive((a) => (a === i ? a : i));
      if (useStore.getState().platformIndex !== i) set({ platformIndex: i });
    };
    const mm = gsap.matchMedia();
    mm.add(DESKTOP, () => {
      const track = trackRef.current!, pin = pinRef.current!;
      const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
      gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: pin, start: "top top", end: () => "+=" + dist() * 1.15, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (self) => apply(Math.round(self.progress * (P.cards.length - 1))),
        },
      });
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh);
      document.fonts?.ready.then(refresh);
      return () => window.removeEventListener("load", refresh);
    });
    mm.add(STACKED, () => {
      const cards = trackRef.current!.querySelectorAll<HTMLElement>("[data-pf-card]");
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) apply(Number((e.target as HTMLElement).dataset.pfCard)); });
      }, { rootMargin: "-45% 0px -45% 0px" });
      cards.forEach((c) => io.observe(c));
      return () => io.disconnect();
    });
    return () => mm.revert();
  }, [set]);

  const ac = CARD_ACCENTS[active];

  return (
    <section id="features" data-chapter="platform" className="section pf-section">
      <div className="container-x">
        <SectionHead eyebrow={P.eyebrow} title={P.title} lede={P.lede} lede2={P.lede2} />
      </div>

      <div ref={pinRef} className="pf-pin relative mt-14 lg:mt-16">
        {/* progress HUD */}
        <div className="pf-hud container-x hidden items-end gap-8" aria-hidden>
          <div className="mono flex shrink-0 items-baseline gap-2">
            <span className="pf-count font-display text-[44px] font-extrabold leading-none tracking-[-0.04em]" key={active} style={{ color: ac, textShadow: `0 0 28px ${ac}66` }}>{P.cards[active].n}</span>
            <span className="text-[14px]" style={{ color: "var(--ink-faint)" }}>/ {LAST}</span>
          </div>
          <div className="grid flex-1 grid-cols-6 gap-3">
            {P.cards.map((c, i) => {
              const on = i === active, past = i < active;
              return (
                <div key={c.n} className="flex min-w-0 flex-col gap-2">
                  <span className="relative h-[3px] overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                    <span className="absolute inset-0 origin-left rounded-full" style={{
                      background: `linear-gradient(90deg, ${CARD_ACCENTS[i]}, color-mix(in oklab, ${CARD_ACCENTS[i]} 40%, white))`,
                      transform: `scaleX(${on || past ? 1 : 0})`, opacity: on ? 1 : 0.4,
                      boxShadow: on ? `0 0 12px ${CARD_ACCENTS[i]}` : "none",
                      transition: "transform .8s cubic-bezier(.16,1,.3,1), opacity .5s",
                    }} />
                  </span>
                  <span className="truncate text-[10.5px] uppercase tracking-[.14em]" style={{ color: on ? "var(--ink)" : "var(--ink-faint)", transition: "color .4s" }}>{c.title}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div ref={trackRef} className="pf-track">
          {P.cards.map((_, i) => <Card key={i} i={i} active={active === i} reduced={reduced} />)}
        </div>
      </div>

      <style>{`
        .pf-card{position:relative;isolation:isolate;border-radius:26px;min-height:540px;
          background:linear-gradient(180deg,color-mix(in oklab,var(--surface-flat) 88%,transparent),color-mix(in oklab,var(--surface-flat) 82%,transparent));
          backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);
          border:1px solid color-mix(in oklab,var(--ac) 18%,var(--line));
          box-shadow:0 30px 80px -30px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.04);
          transition:transform .8s cubic-bezier(.16,1,.3,1),opacity .8s cubic-bezier(.16,1,.3,1),filter .8s,border-color .6s,box-shadow .8s}
        .pf-card.is-on{border-color:color-mix(in oklab,var(--ac) 45%,transparent);box-shadow:0 40px 100px -30px color-mix(in oklab,var(--ac) 35%,transparent),0 30px 80px -30px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06)}
        .pf-topglow{position:absolute;left:12%;right:12%;top:-1px;height:1px;border-radius:9px;z-index:1;pointer-events:none;
          background:linear-gradient(90deg,transparent,var(--ac),transparent);box-shadow:0 0 18px 2px var(--ac);opacity:0;transition:opacity .8s}
        .pf-radial{position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;
          background:radial-gradient(80% 55% at 50% 0%,color-mix(in oklab,var(--ac) 20%,transparent),transparent 70%);opacity:0;transition:opacity .8s}
        .pf-card.is-on .pf-topglow,.pf-card.is-on .pf-radial{opacity:1}
        .pf-num{display:block;font-weight:800;font-size:96px;line-height:.9;letter-spacing:-0.05em}
        .pf-num-o{color:transparent;-webkit-text-stroke:1px var(--line-strong)}
        .pf-num-f{position:absolute;inset:0;transition:clip-path .9s cubic-bezier(.16,1,.3,1);color:transparent;-webkit-background-clip:text;background-clip:text;
          background-image:linear-gradient(160deg,color-mix(in oklab,var(--ac) 35%,white),var(--ac) 55%,color-mix(in oklab,var(--ac) 60%,#1F6FD6))}
        .pf-vis{border:1px solid color-mix(in oklab,var(--ac) 22%,var(--line));
          background:
            radial-gradient(70% 90% at 50% 50%,color-mix(in oklab,var(--ac) 12%,transparent),transparent 70%),
            linear-gradient(color-mix(in oklab,var(--ac) 9%,transparent) 1px,transparent 1px) 0 0/22px 22px,
            linear-gradient(90deg,color-mix(in oklab,var(--ac) 9%,transparent) 1px,transparent 1px) 0 0/22px 22px,
            color-mix(in oklab,var(--ground) 70%,transparent);
          box-shadow:inset 0 0 40px rgba(0,0,0,.35)}
        .pf-track{display:grid;grid-template-columns:1fr;gap:20px;padding-inline:clamp(16px,4vw,40px);max-width:1280px;margin-inline:auto}
        @media (min-width:768px){.pf-track{grid-template-columns:1fr 1fr}}
        .pf-count{animation:pf-count .6s cubic-bezier(.16,1,.3,1)}
        @keyframes pf-count{from{opacity:0;transform:translateY(10px);filter:blur(6px)}}
        @media (min-width:1024px) and (prefers-reduced-motion:no-preference){
          .pf-pin{height:100vh;display:flex;flex-direction:column;justify-content:center;gap:34px;overflow:hidden}
          .pf-hud{display:flex}
          .pf-track{display:flex;align-items:center;width:max-content;max-width:none;margin:0;gap:36px;will-change:transform;
            padding-inline:calc((100vw - min(560px,80vw)) / 2)}
          .pf-card{width:min(560px,80vw);min-height:min(540px,calc(100vh - 170px));flex-shrink:0;opacity:.45;transform:scale(.9);filter:saturate(.6) brightness(.85)}
          .pf-card.is-on{opacity:1;transform:none;filter:none}
        }
      `}</style>
    </section>
  );
}
