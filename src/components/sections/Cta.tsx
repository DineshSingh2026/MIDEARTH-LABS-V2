"use client";
import { Fragment, useEffect, useRef } from "react";
import { site } from "@/content/site";
import { Reveal } from "@/components/ui/Reveal";
import { Magnetic } from "@/components/ui/interactions";
import "./parts/parts.css";

const { cta, pricing } = site;
const WORDS = cta.headline.split(" ").map((w) => ({ w, grad: w.toLowerCase().replace(/[^a-z]/g, "") === "autopilot" }));
const STAGGER = 90;

export default function Cta() {
  const h2 = useRef<HTMLHeadingElement>(null);

  // Word-by-word rise behind a clip mask.
  useEffect(() => {
    const el = h2.current;
    if (!el) return;
    const words = el.querySelectorAll<HTMLElement>("[data-w]");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.forEach((w) => { w.style.transform = "none"; w.style.opacity = "1"; });
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      words.forEach((w, i) => {
        w.style.transition = `transform 1.1s cubic-bezier(.16,1,.3,1) ${i * STAGGER}ms, opacity .8s ease ${i * STAGGER}ms`;
        w.style.transform = "translateY(0)";
        w.style.opacity = "1";
      });
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="get-started" data-chapter="cta" className="relative flex min-h-[90vh] items-center justify-center overflow-clip py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(55% 45% at 50% 50%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 72%)" }} />
      {/* light burst behind the headline */}
      <div aria-hidden className="burst">
        <div className="burst-rays" />
        <div className="burst-rays b2" />
        <div className="burst-ring" />
        <div className="burst-core" />
      </div>
      <div className="container-x relative flex flex-col items-center gap-9 text-center">
        <h2 ref={h2} aria-label={cta.headline} className="cta-h2 font-display font-extrabold"
          style={{ fontSize: "clamp(40px, 6vw, 88px)", lineHeight: 1.04, letterSpacing: "-0.04em", maxWidth: "15ch" }}>
          {WORDS.map(({ w, grad }, i) => (
            <Fragment key={i}>
              <span aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
                <span data-w className={`inline-block ${grad ? "grad-word" : ""}`} style={{ transform: "translateY(110%)", opacity: 0, textShadow: grad ? "none" : undefined }}>{w}</span>
              </span>
              {i < WORDS.length - 1 && " "}
            </Fragment>
          ))}
        </h2>
        <Reveal delay={350} className="w-full max-w-full">
          <p className="lede mx-auto" style={{ color: "var(--ink)", fontWeight: 500, textShadow: "0 0 4px var(--ground), 0 0 18px var(--ground), 0 0 36px var(--ground)" }}>{cta.sub}</p>
        </Reveal>
        <Reveal delay={500} className="flex w-full flex-wrap items-center justify-center gap-4">
          <Magnetic strength={10}>
            <a href={cta.button.href} className="btn-primary"
              style={{ padding: "17px 32px", fontSize: 16, boxShadow: "0 0 0 1px rgba(255,255,255,.08) inset, 0 14px 50px rgba(91,46,224,.55), 0 0 90px rgba(31,111,214,.35)" }}>
              {cta.button.label}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </a>
          </Magnetic>
          <a href="#pricing" className="btn-ghost" style={{ padding: "16px 28px", fontSize: 16 }} data-cursor="hover">{pricing.title}</a>
        </Reveal>
      </div>
      <div id="demo" className="absolute left-0 top-0" />
    </section>
  );
}
