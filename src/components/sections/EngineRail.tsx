"use client";
import { CSSProperties } from "react";
import { site, engineColor, ACCENT } from "@/content/site";
import { useStore } from "@/lib/store";
import { Marquee } from "@/components/ui/interactions";

const R = site.engineRail;
type Item = { slug: string; name: string; by: string };

function EngineChip({ it, dup = false }: { it: Item; dup?: boolean }) {
  const set = useStore((s) => s.set);
  const c = engineColor[it.slug] ?? ACCENT;
  const L = useStore((s) => s.theme) === "light";
  const cv = L ? (c.toUpperCase() === "#FFFFFF" ? "#14173A" : c === ACCENT ? "#5B2EE0" : c) : c;
  return (
    <span aria-hidden={dup || undefined} className="chip eng-chip shrink-0 whitespace-nowrap" style={{ "--c": cv } as CSSProperties}
      onMouseEnter={() => set({ engineColor: c })} onMouseLeave={() => set({ engineColor: null })}>
      <span className="chip-icon">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/brand/engines/${it.slug}.svg`} alt="" width={16} height={16} className="logo-img h-4 w-4" loading="lazy" />
      </span>
      <span className="font-bold" style={{ color: "var(--ink)" }}>{it.name}</span>
      {it.by && <span className="font-medium" style={{ color: "var(--ink-faint)" }}>{it.by}</span>}
    </span>
  );
}

export default function EngineRail() {
  return (
    <section data-chapter="engines" aria-label={R.label} className="relative py-16 md:py-24">
      <div className="container-x mb-7 flex items-center gap-5">
        <span className="eyebrow shrink-0">{R.label}</span>
        <span aria-hidden className="h-px flex-1" style={{ background: "linear-gradient(90deg, var(--line-strong), transparent)" }} />
      </div>
      <div className="er-band relative">
        <span aria-hidden className="er-hair top-0" />
        <span aria-hidden className="er-hair bottom-0" />
        <div className="flex flex-col gap-0.5 py-3">
          <Marquee seconds={55} className="py-3">
            {R.engines.map((e) => <EngineChip key={e.slug} it={e} />)}
          </Marquee>
          <Marquee seconds={80} reverse className="py-3">
            {[...R.tools, ...R.tools, ...R.tools].map((e, i) => <EngineChip key={`${e.slug}-${i}`} it={e} dup={i >= R.tools.length} />)}
          </Marquee>
        </div>
      </div>
      <div className="container-x mt-5">
        <p className="text-[13px] italic" style={{ color: "var(--ink-faint)" }}>{R.note}</p>
      </div>
      <style>{`
        .er-band{background:linear-gradient(180deg,transparent,color-mix(in oklab,var(--surface-flat) 55%,transparent) 30%,color-mix(in oklab,var(--surface-flat) 55%,transparent) 70%,transparent);
          backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
        .er-hair{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,color-mix(in oklab,#A98CFF 55%,transparent) 30%,color-mix(in oklab,#6FD0FF 45%,transparent) 70%,transparent)}
        .eng-chip{cursor:default;padding:9px 16px 9px 9px;border:1px solid transparent;
          background:linear-gradient(var(--chip-bg),var(--chip-bg)) padding-box,linear-gradient(120deg,color-mix(in oklab,#C9A7FF 40%,transparent),color-mix(in oklab,#6FD0FF 12%,transparent) 55%,color-mix(in oklab,#C9A7FF 28%,transparent)) border-box;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
          transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s,background .35s}
        .eng-chip:hover{transform:translateY(-4px);
          background:linear-gradient(color-mix(in oklab,var(--c) 10%,var(--chip-bg)),color-mix(in oklab,var(--c) 10%,var(--chip-bg))) padding-box,linear-gradient(120deg,var(--c),color-mix(in oklab,var(--c) 30%,transparent)) border-box;
          box-shadow:0 12px 34px -8px color-mix(in oklab,var(--c) 75%,transparent),0 0 0 4px color-mix(in oklab,var(--c) 12%,transparent)}
        :root[data-theme="light"] .er-band{background:linear-gradient(180deg,transparent,rgba(255,255,255,.6) 30%,rgba(255,255,255,.6) 70%,transparent)}
        :root[data-theme="light"] .er-hair{background:linear-gradient(90deg,transparent,rgba(91,46,224,.3) 30%,rgba(31,111,214,.25) 70%,transparent)}
        :root[data-theme="light"] .eng-chip{background:linear-gradient(#fff,#fff) padding-box,linear-gradient(120deg,rgba(91,46,224,.28),rgba(31,111,214,.1) 55%,rgba(91,46,224,.2)) border-box;box-shadow:0 6px 16px -10px rgba(91,46,224,.22)}
        :root[data-theme="light"] .eng-chip:hover{background:linear-gradient(color-mix(in oklab,var(--c) 6%,#fff),color-mix(in oklab,var(--c) 6%,#fff)) padding-box,linear-gradient(120deg,var(--c),color-mix(in oklab,var(--c) 30%,transparent)) border-box;box-shadow:0 14px 30px -12px color-mix(in oklab,var(--c) 45%,transparent),0 0 0 4px color-mix(in oklab,var(--c) 8%,transparent)}
        .eng-chip .chip-icon{transition:background .35s,box-shadow .35s}
        .eng-chip:hover .chip-icon{background:color-mix(in oklab,var(--c) 26%,transparent);box-shadow:0 0 14px color-mix(in oklab,var(--c) 60%,transparent)}
      `}</style>
    </section>
  );
}
