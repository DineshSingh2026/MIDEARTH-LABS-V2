"use client";
import { useEffect, useRef, ElementType, ReactNode, CSSProperties } from "react";

/** Fades/rises children in when they enter the viewport. `delay` in ms. */
export function Reveal({ as: Tag = "div", children, className = "", delay = 0, style }: { as?: ElementType; children: ReactNode; className?: string; delay?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => el.classList.add("in"), delay); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <Tag ref={ref} className={`reveal ${className}`} style={style}>{children}</Tag>;
}

/** Line/word reveal: words rise 110% -> 0 behind a clip mask, staggered. Real text stays in DOM (aria-label on wrapper). */
export function SplitReveal({ text, as: Tag = "span", className = "", stagger = 60, delay = 0, wordClassName = "" }: { text: string; as?: ElementType; className?: string; stagger?: number; delay?: number; wordClassName?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const words = el.querySelectorAll<HTMLElement>("[data-w]");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { words.forEach((w) => (w.style.transform = "none")); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      words.forEach((w, i) => {
        w.style.transition = `transform 1s cubic-bezier(.16,1,.3,1) ${delay + i * stagger}ms`;
        w.style.transform = "translateY(0)";
      });
      io.disconnect();
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay, stagger]);
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <span data-w className={`inline-block ${wordClassName}`} style={{ transform: "translateY(110%)" }}>{w}</span>
          {" "}
        </span>
      ))}
    </Tag>
  );
}

/** Section heading block: eyebrow, H2, lede(s). */
export function SectionHead({ eyebrow, title, lede, lede2, center = false, gradTitle = false }: { eyebrow: string; title: string; lede?: string; lede2?: string; center?: boolean; gradTitle?: boolean }) {
  return (
    <div className={`flex flex-col gap-5 ${center ? "items-center text-center" : ""}`}>
      <Reveal><span className="eyebrow">{eyebrow}</span></Reveal>
      <SplitReveal as="h2" text={title} className="h2" wordClassName={gradTitle ? "grad-word" : ""} />
      {lede && <Reveal delay={150}><p className={`lede ${center ? "mx-auto" : ""}`} style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{lede}</p></Reveal>}
      {lede2 && <Reveal delay={250}><p className={`lede ${center ? "mx-auto" : ""}`}>{lede2}</p></Reveal>}
    </div>
  );
}
