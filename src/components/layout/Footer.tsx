"use client";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { BrandLogo } from "./Nav";

const EASE = "cubic-bezier(.16,1,.3,1)";

export default function Footer() {
  const ghost = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ghost.current; if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const f = site.footer;
  const letters = Array.from(f.ghostWord);

  return (
    <footer data-chapter="footer" className={`ft relative z-10 flex min-h-[80vh] flex-col justify-end overflow-hidden ${inView ? "is-in" : ""}`}>
      {/* gradient divider */}
      <div aria-hidden="true" className="ft-divider absolute inset-x-0 top-0 h-px" />
      <div aria-hidden="true" className="ft-divider-glow pointer-events-none absolute left-1/2 top-0 h-24 w-[60%] -translate-x-1/2" />

      {/* ghost wordmark (WebGL forms the same word in particles) */}
      <div ref={ghost} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[8vh] flex select-none justify-center px-[2vw]">
        <div className="ft-ghost relative whitespace-nowrap font-display font-extrabold">
          {letters.map((ch, i) => (
            <span key={i} className="ft-letter relative inline-block" style={{ "--i": i } as CSSProperties}>
              <span className="ft-stroke">{ch}</span>
              <span className="ft-fill absolute inset-0">{ch}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="container-x relative pb-8 pt-[30vh] sm:pt-[28vh]">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-10">
          <div className="ft-rise max-w-sm" style={{ "--d": "0ms" } as CSSProperties}>
            <a href="#top" className="inline-flex items-center gap-3 rounded-xl p-1 -m-1" aria-label={site.brand}>
              <BrandLogo className="[--lh:34px]" />
            </a>
            <p className="mt-6 text-[15px] leading-[1.7] text-ink-muted">{f.about}</p>
            <p className="mt-7 font-display text-[22px] font-bold leading-tight tracking-[-0.02em] sm:text-[24px]">
              <span className="grad-word">{f.tagline}</span>
            </p>
          </div>

          {f.columns.map((col, ci) => (
            <nav key={col.title} aria-label={col.title} className="ft-rise" style={{ "--d": `${120 + ci * 90}ms` } as CSSProperties}>
              <h2 className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[.22em] text-ink-faint">
                <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-accent opacity-80" />
                {col.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="group inline-flex items-center gap-1.5 rounded text-[15px] font-medium text-ink-soft transition-colors duration-300 hover:text-ink"
                    >
                      <span className="relative">
                        {l.label}
                        <span aria-hidden="true" className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-[linear-gradient(90deg,#A98CFF,#6FD0FF)] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-100" />
                      </span>
                      <svg aria-hidden="true" viewBox="0 0 12 12" width="11" height="11" className="-translate-x-1 opacity-0 transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-0 group-hover:opacity-100">
                        <path d="M3 9 9 3M4.5 3H9v4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="relative mt-16">
          <div aria-hidden="true" className="ft-divider h-px" />
          <div className="flex flex-col gap-3 pt-6 font-mono text-[12px] tracking-[.02em] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-[#6FD0FF] shadow-[0_0_8px_#6FD0FF]" />
              {f.license}
            </span>
            <span>{f.copyright}</span>
          </div>
        </div>
      </div>

      <style>{`
        .ft-divider{background:linear-gradient(90deg,transparent,color-mix(in oklab,#A98CFF 60%,transparent) 30%,color-mix(in oklab,#6FD0FF 60%,transparent) 70%,transparent)}
        .ft-divider-glow{background:radial-gradient(50% 100% at 50% 0%,color-mix(in oklab,var(--accent) 16%,transparent),transparent 70%)}
        .ft-ghost{font-size:min(15.2vw,240px);line-height:.82;letter-spacing:-0.045em}
        /* faint tint instead of -webkit-text-stroke: the variable font has overlapping contours that a stroke exposes */
        .ft-stroke{background:linear-gradient(180deg,color-mix(in oklab,var(--accent) 13%,transparent),color-mix(in oklab,var(--accent) 4%,transparent) 85%);-webkit-background-clip:text;background-clip:text;color:transparent}
        .ft-fill{
          background:linear-gradient(180deg,color-mix(in oklab,#C9A7FF 30%,transparent) 0%,color-mix(in oklab,#6FD0FF 14%,transparent) 48%,transparent 90%);
          -webkit-background-clip:text;background-clip:text;color:transparent;
          clip-path:inset(100% 0 0 0);
          transition:clip-path 1.6s ${EASE} calc(var(--i) * 70ms + 250ms);
        }
        .ft-letter{opacity:0;transform:translateY(18%);filter:blur(8px);
          transition:opacity 1.2s ${EASE} calc(var(--i) * 70ms),transform 1.4s ${EASE} calc(var(--i) * 70ms),filter 1.2s ${EASE} calc(var(--i) * 70ms)}
        .ft.is-in .ft-letter{opacity:1;transform:none;filter:none}
        .ft.is-in .ft-fill{clip-path:inset(0 0 0 0)}
        .ft-rise{opacity:0;transform:translateY(18px);transition:opacity 1s ${EASE} var(--d),transform 1s ${EASE} var(--d)}
        .ft.is-in .ft-rise{opacity:1;transform:none}
        @media (prefers-reduced-motion: reduce){
          .ft-letter,.ft-rise{opacity:1;transform:none;filter:none}
          .ft-fill{clip-path:none}
        }
      `}</style>
    </footer>
  );
}
