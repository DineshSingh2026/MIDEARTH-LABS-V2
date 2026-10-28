"use client";
import { PointerEvent } from "react";

/** Download link with a click ripple and a looping drop-arrow on hover. */
export function DownloadButton({ href, label, ariaLabel, primary }: { href: string; label: string; ariaLabel?: string; primary: boolean }) {
  const ripple = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement("span");
    s.className = "dl-ripple";
    s.style.width = s.style.height = `${size}px`;
    s.style.left = `${e.clientX - r.left}px`;
    s.style.top = `${e.clientY - r.top}px`;
    s.addEventListener("animationend", () => s.remove());
    el.appendChild(s);
  };
  return (
    <a href={href} onPointerDown={ripple} aria-label={ariaLabel} className={`${primary ? "btn-primary" : "btn-ghost"} dl-btn w-full whitespace-nowrap`} style={{ fontSize: 14, paddingInline: 16 }} data-cursor="hover">
      <svg className="dl-arrow shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <g className="shaft"><path d="M8 2v8M4.5 6.8 8 10.3l3.5-3.5" /></g>
        <path d="M2.5 13.5h11" />
      </svg>
      <span>{label}</span>
    </a>
  );
}
