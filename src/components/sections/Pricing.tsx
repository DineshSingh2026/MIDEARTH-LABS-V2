"use client";
import { useRef, useState } from "react";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { SectionHead, Reveal } from "@/components/ui/Reveal";
import { spotHandlers } from "@/components/ui/interactions";
import { useInView } from "./parts/hooks";
import "./parts/parts.css";

const { pricing } = site;
type Plan = (typeof pricing.plans)[number];

/** Log-scale meter: 100 -> ~25%, 5,000 -> ~64%, 25,000 -> ~80%, unlimited -> 100%. */
const meterPct = (runs: number | null) => (runs == null ? 100 : Math.max(8, Math.min(100, 22.94 * Math.log10(runs) - 20.87)));
const RUNS_LABEL = "runs / month";

/** Each digit is a 0-9 strip (twice, so every digit rolls a full turn) translated to its target. */
function SlotPrice({ price, on }: { price: string; on: boolean }) {
  const prefix = price.replace(/\d.*/, "");
  const digits = price.slice(prefix.length).split("");
  return (
    <span aria-label={price} className="inline-flex font-mono font-bold tabular-nums" style={{ fontSize: 52, lineHeight: 1, letterSpacing: "-0.03em" }}>
      <span aria-hidden className="flex">
        <span>{prefix}</span>
        {digits.map((d, i) => (
          <span key={i} className="slot-col">
            <span className="slot-strip" style={{ transform: `translateY(-${on ? (10 + Number(d)) * 5 : 0}%)`, transitionDelay: `${i * 140}ms` }}>
              {Array.from({ length: 20 }, (_, k) => <span key={k}>{k % 10}</span>)}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

function Check({ on, delay }: { on: boolean; delay: number }) {
  return (
    <svg className="check mt-[3px] shrink-0" width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="8.5" fill="color-mix(in oklab, var(--accent) 16%, transparent)" />
      <path d="M5.2 9.3l2.5 2.5 5-5.2" pathLength={1} fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDashoffset: on ? 0 : 1, transitionDelay: `${delay}ms` }} />
    </svg>
  );
}

function PlanCard({ plan, i, hovered }: { plan: Plan; i: number; hovered: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: true, threshold: 0.3 });
  const set = useStore((s) => s.set);
  const pro = !!plan.badge;
  const pct = meterPct(plan.runs);
  const cta = plan.custom ? site.cta.button : { label: pricing.title, href: "#download" };

  return (
    <div
      ref={ref}
      {...spotHandlers()}
      onMouseEnter={() => set({ pricingHover: i })}
      onMouseLeave={() => set({ pricingHover: null })}
      className={`price-card lift glass spot conic-border ${pro ? "card-pro spin" : ""} relative flex h-full flex-col gap-7 p-7 xl:p-8`}
      style={pro ? { background: "linear-gradient(180deg, color-mix(in oklab, var(--accent) 14%, transparent), transparent 45%), color-mix(in oklab, var(--surface-flat) 78%, transparent)" } : undefined}
    >
      <span className="hairline" aria-hidden />
      <span className="sheen" aria-hidden />
      {plan.badge && (
        <span className="absolute -top-3.5 left-1/2 z-[1] inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-wide text-white"
          style={{ background: "var(--grad-cta)", boxShadow: "0 0 0 1px rgba(255,255,255,.18) inset, var(--cta-shadow), 0 0 24px rgba(124,92,255,.6)" }}>
          <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden><path d="M6 .8l1.5 3.4 3.7.4-2.8 2.5.8 3.6L6 8.9 2.8 10.7l.8-3.6L.8 4.6l3.7-.4z" fill="currentColor" /></svg>
          {plan.badge}
        </span>
      )}
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold tracking-tight">{plan.name}</h3>
          <span className="mono" aria-hidden style={{ color: "var(--ink-faint)", fontSize: 11 }}>{String(i + 1).padStart(2, "0")}</span>
        </div>
        <div className="flex h-[60px] items-end gap-1.5">
          {plan.custom ? (
            <span className="grad-word whitespace-nowrap font-display font-extrabold" style={{ fontSize: "clamp(24px, 1.9vw, 28px)", lineHeight: 1.3, letterSpacing: "-0.03em" }}>{plan.price}</span>
          ) : (
            <>
              <SlotPrice price={plan.price} on={on} />
              <span className="pb-1 text-[14px]" style={{ color: "var(--ink-muted)" }}>{pricing.perMonth}</span>
            </>
          )}
        </div>
        <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>{plan.body}</p>
      </div>

      {/* runs meter */}
      <div className="relative flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "color-mix(in oklab, var(--surface-flat) 40%, transparent)" }}>
        <div className="flex items-baseline justify-between">
          <span className="mono" style={{ color: "var(--ink-muted)", fontSize: 12 }}>{RUNS_LABEL}</span>
          <span className="mono font-semibold" style={{ color: "var(--ink)", fontSize: plan.runs == null ? 18 : 14, lineHeight: 1 }}>{plan.runs == null ? "∞" : plan.runs.toLocaleString("en-US")}</span>
        </div>
        <div className="meter-track" aria-hidden>
          {/* log-decade ticks: 100, 1k, 10k */}
          {[100, 1000, 10000].map((t) => <span key={t} className="meter-tick" style={{ left: `${meterPct(t)}%` }} />)}
          <div className="meter-fill"
            style={{
              width: on || hovered ? `${pct}%` : "0%",
              boxShadow: hovered ? "0 0 16px color-mix(in oklab, var(--accent) 85%, transparent)" : "0 0 8px color-mix(in oklab, var(--accent) 40%, transparent)",
              filter: hovered ? "brightness(1.2)" : "none",
            }} />
        </div>
      </div>

      <ul className="relative flex flex-col gap-2.5">
        {plan.features.map((f, k) => {
          const d = 250 + k * 130;
          return (
            <li key={f} className="flex gap-2.5 text-[14.5px] transition-all duration-500"
              style={{ color: "var(--ink-soft)", opacity: on ? 1 : 0, transform: on ? "none" : "translateX(-8px)", transitionDelay: `${d}ms` }}>
              <Check on={on} delay={d + 120} />
              {f}
            </li>
          );
        })}
      </ul>

      <a href={cta.href} className={`${pro ? "btn-primary" : "btn-ghost"} relative mt-auto w-full justify-center`} data-cursor="hover">{cta.label}</a>
    </div>
  );
}

export default function Pricing() {
  const hover = useStore((s) => s.pricingHover);
  return (
    <section id="pricing" data-chapter="pricing" className="section">
      <div className="container-x">
        <SectionHead eyebrow={pricing.eyebrow} title={pricing.title} lede={pricing.lede} center />
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 md:mt-20 lg:pt-6">
          {pricing.plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 90} className="h-full">
              <PlanCard plan={plan} i={i} hovered={hover === i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
