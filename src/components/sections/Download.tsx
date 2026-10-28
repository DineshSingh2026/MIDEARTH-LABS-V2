"use client";
import { MouseEvent, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { detectPlatform } from "@/lib/detectPlatform";
import { SectionHead, Reveal } from "@/components/ui/Reveal";
import { spotHandlers } from "@/components/ui/interactions";
import { DownloadButton } from "./parts/DownloadButton";
import { LaptopIcon, MonitorIcon, AndroidIcon, IPhoneIcon, LaptopArt, MonitorArt, AndroidArt, IPhoneArt } from "./parts/DeviceIcons";
import { useReducedMotion } from "./parts/hooks";
import "./parts/parts.css";

const { download } = site;
const ICONS = { mac: LaptopIcon, win: MonitorIcon, android: AndroidIcon, ios: IPhoneIcon } as const;
const ARTS = { mac: LaptopArt, win: MonitorArt, android: AndroidArt, ios: IPhoneArt } as const;
type Card = (typeof download.cards)[number];

function PlatformCard({ card, detected, onEnter, onLeave }: { card: Card; detected: boolean; onEnter: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const spot = spotHandlers();
  const Icon = ICONS[card.id];
  const Art = ARTS[card.id];

  const move = (e: MouseEvent<HTMLDivElement>) => {
    spot.onMouseMove(e);
    if (reduced) return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.classList.add("is-tilting");
    el.style.transform = `perspective(900px) rotateX(${(-py * 16).toFixed(2)}deg) rotateY(${(px * 16).toFixed(2)}deg)`;
  };
  const leave = () => {
    const el = ref.current;
    if (el) { el.classList.remove("is-tilting"); el.style.transform = ""; }
    onLeave();
  };

  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseEnter={onEnter}
      onMouseLeave={leave}
      onFocus={onEnter}
      className={`tilt lift glass spot conic-border ${detected ? "spin" : ""} flex h-full flex-col gap-6 p-4 pb-6 md:p-5 md:pb-7`}
      style={detected ? { boxShadow: "0 30px 90px -40px rgba(91,46,224,.8)" } : undefined}
    >
      <span className="hairline" aria-hidden />
      <span className="sheen" aria-hidden />
      <div className="dev-stage" aria-hidden>
        <div className="dev-art"><Art /></div>
      </div>
      {detected && (
        <span className="absolute -top-3.5 left-1/2 z-[2] inline-flex -translate-x-1/2 items-center whitespace-nowrap rounded-full p-[3px] pr-3"
          style={{ background: "var(--chip-bg)", border: "1px solid var(--line-strong)", boxShadow: "0 0 24px rgba(124,92,255,.45)" }}>
          <span className="mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "var(--grad-cta)", color: "#fff", fontSize: 11 }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />Detected
          </span>
          <span className="mono pl-2" style={{ color: "var(--ink)", fontSize: 11 }}>Recommended for you</span>
        </span>
      )}
      <div className="relative flex flex-col gap-3 px-2 md:px-2.5">
        <h3 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl [&>svg]:h-7 [&>svg]:w-7" style={{ background: "var(--chip-icon-bg)", color: "var(--accent)" }} aria-hidden><Icon /></span>
          {card.title}
        </h3>
        <ul className="flex flex-col gap-1.5 text-[14.5px]" style={{ color: "var(--ink-muted)" }}>
          {card.meta.map((m) => (
            <li key={m} className="flex gap-2">
              <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
              {m}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative mt-auto flex flex-col gap-2.5 px-2 md:px-2.5">
        <DownloadButton primary href={`${download.base}/${card.primary.file}`} label={card.primary.label} ariaLabel={`${card.title}: ${card.primary.label}`} />
        {card.secondary && (
          <DownloadButton primary={false} href={`${download.base}/${card.secondary.file}`} label={card.secondary.label} ariaLabel={`${card.title}: ${card.secondary.label}`} />
        )}
      </div>
    </div>
  );
}

export default function Download() {
  const set = useStore((s) => s.set);
  const [detected, setDetected] = useState<number | null>(null);

  useEffect(() => {
    const p = detectPlatform();
    const i = p ? download.cards.findIndex((c) => c.id === p) : -1;
    const idx = i >= 0 ? i : null;
    setDetected(idx);
    set({ deviceIndex: idx ?? 0 });
  }, [set]);

  return (
    <section id="download" data-chapter="download" className="section">
      <div className="container-x">
        <SectionHead eyebrow={download.eyebrow} title={download.title} lede={download.lede} center />
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 md:mt-20">
          {download.cards.map((card, i) => (
            <Reveal key={card.id} delay={i * 90} className="h-full">
              <PlatformCard
                card={card}
                detected={detected === i}
                onEnter={() => set({ deviceIndex: i })}
                onLeave={() => set({ deviceIndex: detected ?? 0 })}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
