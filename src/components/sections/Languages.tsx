"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { Reveal } from "@/components/ui/Reveal";
import "./parts/parts.css";
import { useInView, usePageVisible, useReducedMotion } from "./parts/hooks";
import { BrandLogo } from "@/components/layout/Nav";

const { languages } = site;
const LIST = languages.list;
const EASE = [0.16, 1, 0.3, 1] as const;

export default function Languages() {
  const ref = useRef<HTMLElement>(null);
  const set = useStore((s) => s.set);
  const [idx, setIdx] = useState(0);
  const [nonce, setNonce] = useState(0);
  const inView = useInView(ref, { threshold: 0.25 });
  const pageVisible = usePageVisible();
  const reduced = useReducedMotion();

  useEffect(() => { set({ langIndex: idx }); }, [idx, set]);

  // Cycle every 2s, only while on screen and the tab is visible. A pill click restarts the timer.
  useEffect(() => {
    if (!inView || !pageVisible || reduced) return;
    const id = setInterval(() => setIdx((v) => (v + 1) % LIST.length), 2000);
    return () => clearInterval(id);
  }, [inView, pageVisible, reduced, nonce]);

  const cur = LIST[idx];
  const flip = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { y: "70%", opacity: 0, filter: "blur(14px)" },
        animate: { y: "0%", opacity: 1, filter: "blur(0px)" },
        exit: { y: "-70%", opacity: 0, filter: "blur(14px)" },
      };

  return (
    <MotionConfig reducedMotion="user">
      <section ref={ref} id="languages" data-chapter="languages" className="section overflow-x-clip">
        <div className="container-x relative isolate flex flex-col items-center text-center">
          {/* greeting slot */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[18%] -z-[1] h-[60vh] w-[110vw] -translate-x-1/2"
            style={{ background: "radial-gradient(45% 50% at 50% 50%, color-mix(in oklab, var(--accent) 22%, transparent), color-mix(in oklab, #1F6FD6 8%, transparent) 45%, transparent 70%)" }} />
          <div
            className="greet-mask greet-glow relative w-full"
            style={{ height: "1.45em", fontSize: "clamp(80px, 17vw, 260px)", lineHeight: 1.2 }}
          >
            <AnimatePresence initial={false}>
              <motion.span
                key={cur.code}
                lang={cur.code}
                {...flip}
                transition={{ duration: 0.75, ease: EASE }}
                className="grad-word absolute inset-0 flex items-center justify-center whitespace-nowrap font-display"
                style={{ fontWeight: 800, letterSpacing: "-0.04em" }}
              >
                {cur.greeting}
              </motion.span>
            </AnimatePresence>
          </div>

          <Reveal className="mt-2 flex items-center justify-center gap-3">
            <span className="mono" style={{ color: "var(--ink-muted)", fontSize: 15 }}>{languages.from}</span>
            {/* the logo artwork already carries the wordmark, so no separate brand text */}
            <BrandLogo className="[--lh:34px] md:[--lh:42px]" />
          </Reveal>

          <Reveal delay={120} className="mt-8">
            <p className="lede mx-auto">{languages.lede}</p>
          </Reveal>

          <Reveal delay={200} className="mt-10 w-full">
            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
              {LIST.map((l, i) => {
                const on = i === idx;
                return (
                  <button
                    key={l.code}
                    lang={l.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { setIdx(i); setNonce((n) => n + 1); }}
                    data-cursor="hover"
                    className="lang-pill relative rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors duration-300"
                    style={{ borderColor: on ? "transparent" : "var(--line)", background: on ? "transparent" : "var(--chip-bg)", color: on ? "#fff" : "var(--ink-soft)" }}
                  >
                    {on && (
                      <motion.span
                        layoutId="lang-active"
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{ background: "var(--grad-cta)", boxShadow: "var(--cta-shadow)" }}
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{l.label}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={260} className="mt-8">
            <p className="mono" style={{ color: "var(--ink-faint)" }}>{languages.note}</p>
          </Reveal>
        </div>
      </section>
    </MotionConfig>
  );
}
