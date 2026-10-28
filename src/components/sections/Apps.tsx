"use client";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { SectionHead, Reveal } from "@/components/ui/Reveal";
import { Marquee } from "@/components/ui/interactions";
import { useInView, useReducedMotion } from "./parts/hooks";
import "./parts/parts.css";

const { apps } = site;
const ALL = [...apps.rows[0], ...apps.rows[1]];

/** 27 apps split 7 / 9 / 11 across three concentric orbits. */
const RINGS = [
  { start: 0, items: ALL.slice(0, 7), d: 46, dur: 38, rev: false, off: -90 },
  { start: 7, items: ALL.slice(7, 16), d: 70, dur: 58, rev: true, off: -70 },
  { start: 16, items: ALL.slice(16), d: 94, dur: 84, rev: false, off: -84 },
];

const pos = (k: number, n: number, off: number) => {
  const a = ((off + (360 / n) * k) * Math.PI) / 180;
  return { left: `${(50 + 50 * Math.cos(a)).toFixed(3)}%`, top: `${(50 + 50 * Math.sin(a)).toFixed(3)}%` };
};

function Orbit() {
  const box = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLSpanElement | null)[]>([]);
  const beams = useRef<(SVGLineElement | null)[]>([]);
  const look = useRef<SVGGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const inView = useInView(box, { threshold: 0.15 });
  const reduced = useReducedMotion();

  // Every ~1.5s a random app connects to the agent core.
  useEffect(() => {
    if (!inView || reduced) return;
    let last = -1;
    const fire = () => {
      let i = last;
      while (i === last) i = Math.floor(Math.random() * ALL.length);
      last = i;
      setActive(i);
      setTick((t) => t + 1);
    };
    const t0 = setTimeout(fire, 500);
    const id = setInterval(fire, 1500);
    return () => { clearTimeout(t0); clearInterval(id); setActive(null); };
  }, [inView, reduced]);

  // Keep the beam glued to the orbiting logo; the mascot looks at it.
  useEffect(() => {
    if (active === null) {
      look.current?.setAttribute("transform", "translate(0 0)");
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const b = box.current, n = nodes.current[active];
      if (b && n) {
        const br = b.getBoundingClientRect(), nr = n.getBoundingClientRect();
        const x = ((nr.left + nr.width / 2 - br.left) / br.width) * 100;
        const y = ((nr.top + nr.height / 2 - br.top) / br.height) * 100;
        beams.current.forEach((l) => { l?.setAttribute("x2", x.toFixed(2)); l?.setAttribute("y2", y.toFixed(2)); });
        const dx = x - 50, dy = y - 50, len = Math.hypot(dx, dy) || 1;
        look.current?.setAttribute("transform", `translate(${((dx / len) * 5).toFixed(2)} ${((dy / len) * 4).toFixed(2)})`);
      }
      if (performance.now() - t0 < 1400) raf = requestAnimationFrame(loop);
    };
    loop();
    const off = setTimeout(() => setActive(null), 1350);
    return () => { cancelAnimationFrame(raf); clearTimeout(off); };
  }, [active, tick]);

  return (
    <div ref={box} className="orb-box" aria-hidden>
      {/* beam layer */}
      <svg className="absolute inset-0 h-full w-full overflow-visible pointer-events-none" viewBox="0 0 100 100">
        {active !== null && (
          <g key={tick}>
            <line ref={(el) => { beams.current[0] = el; }} pathLength={1} x1="50" y1="50" x2="50" y2="50"
              className="orb-beam orb-beam-glow" stroke="var(--accent)" strokeOpacity=".35" strokeWidth="2.4" strokeLinecap="round" style={{ filter: "blur(1.5px)" }} />
            <line ref={(el) => { beams.current[1] = el; }} pathLength={1} x1="50" y1="50" x2="50" y2="50"
              className="orb-beam orb-beam-core" stroke="#6FD0FF" strokeWidth=".55" strokeLinecap="round" />
          </g>
        )}
      </svg>

      {RINGS.map((ring, r) => (
        <div key={r} className={`orb-ring ${ring.rev ? "rev" : ""}`} style={{ "--d": `${ring.d}%`, "--dur": `${ring.dur}s` } as CSSProperties}>
          <svg className="orb-track" viewBox="0 0 100 100">
            <circle className="line" cx="50" cy="50" r="50" fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle className="hit" cx="50" cy="50" r="50" fill="none" strokeWidth="18" vectorEffect="non-scaling-stroke" />
          </svg>
          {ring.items.map((app, k) => {
            const i = ring.start + k;
            const on = active === i;
            return (
              <span key={app.slug} ref={(el) => { nodes.current[i] = el; }} className={`orb-node ${on ? "is-active" : ""}`} style={pos(k, ring.items.length, ring.off)}>
                <span className="orb-up">
                  <span className="orb-chip">
                    <img src={`/brand/apps/${app.slug}.svg`} alt="" className="logo-img" draggable={false} />
                  </span>
                  <span className="orb-tip">{app.name}</span>
                  {on && <span key={tick} className="orb-toast">connected ✓</span>}
                </span>
              </span>
            );
          })}
        </div>
      ))}

      {/* agent core with mascot */}
      <div className="orb-core">
        {active !== null && <span key={tick} className="orb-ping" />}
        <div className="orb-orb" />
        <svg className="orb-face" viewBox="0 0 100 100">
          <g ref={look} className="look">
            <ellipse cx="33" cy="58" rx="6" ry="3.6" fill="#FF9BD2" opacity=".35" />
            <ellipse cx="67" cy="58" rx="6" ry="3.6" fill="#FF9BD2" opacity=".35" />
            <g className="eye">
              <ellipse cx="39" cy="45" rx="5" ry="7.2" fill="#fff" />
              <ellipse cx="61" cy="45" rx="5" ry="7.2" fill="#fff" />
            </g>
            <path d="M42 60 Q50 67.5 58 60" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Pill({ slug, name }: { slug: string; name: string }) {
  return (
    <span className="chip whitespace-nowrap transition-colors duration-300 hover:border-[var(--accent)] hover:text-[var(--ink)]">
      <span className="chip-icon"><img src={`/brand/apps/${slug}.svg`} alt="" width={15} height={15} className="logo-img h-[15px] w-[15px]" loading="lazy" /></span>
      {name}
    </span>
  );
}

export default function Apps() {
  return (
    <section id="apps" data-chapter="apps" className="relative overflow-x-clip pb-[clamp(72px,10vh,140px)]">
      <div className="container-x orb-stage grid grid-cols-1 items-center gap-10 pt-[clamp(96px,14vh,180px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6 lg:pt-0">
        <div className="lg:max-w-[30rem]">
          <SectionHead eyebrow={apps.eyebrow} title={apps.title} lede={apps.lede} />
        </div>
        <Reveal delay={100} className="w-full">
          <Orbit />
        </Reveal>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <span aria-hidden className="mx-auto mb-6 block h-px w-[min(880px,80%)]" style={{ background: "linear-gradient(90deg, transparent, var(--line-strong), transparent)" }} />
        <Marquee seconds={46}>
          {apps.rows[0].map((a) => <Pill key={a.slug} {...a} />)}
        </Marquee>
        <Marquee seconds={46} reverse>
          {apps.rows[1].map((a) => <Pill key={a.slug} {...a} />)}
        </Marquee>
      </div>
      <div className="container-x">
        <p className="mono mt-8 text-center" style={{ color: "var(--ink-faint)" }}>{apps.note}</p>
      </div>
    </section>
  );
}
