"use client";
import { MouseEvent } from "react";

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

function apply(next: "dark" | "light") {
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
}

/** Dark/light switch with a circular View Transition reveal from the button. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    const doc = document as VTDoc;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduced) { apply(next); return; }

    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = doc.startViewTransition(() => apply(next));
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(.16,1,.3,1)", pseudoElement: "::view-transition-new(root)" } as KeyframeAnimationOptions,
      );
    }).catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      title="Toggle colour theme"
      data-cursor="hover"
      className={`theme-toggle relative grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft transition-colors duration-300 hover:border-line-strong hover:text-ink ${className}`}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="tt-svg">
        <mask id="tt-moon-mask">
          <rect x="0" y="0" width="24" height="24" fill="#fff" />
          <circle className="tt-cut" cx="24" cy="4" r="7" fill="#000" />
        </mask>
        <circle className="tt-core" cx="12" cy="12" r="5" fill="currentColor" mask="url(#tt-moon-mask)" />
        <g className="tt-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="12" y1="1.5" x2="12" y2="3.5" /><line x1="12" y1="20.5" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="3.5" y2="12" /><line x1="20.5" y1="12" x2="22.5" y2="12" />
          <line x1="4.6" y1="4.6" x2="6" y2="6" /><line x1="18" y1="18" x2="19.4" y2="19.4" />
          <line x1="4.6" y1="19.4" x2="6" y2="18" /><line x1="18" y1="6" x2="19.4" y2="4.6" />
        </g>
      </svg>
      <style>{`
        ::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}
        .theme-toggle .tt-svg{transition:transform .6s cubic-bezier(.16,1,.3,1)}
        .theme-toggle .tt-core{transform-origin:12px 12px;transition:transform .6s cubic-bezier(.16,1,.3,1)}
        .theme-toggle .tt-cut{transition:cx .6s cubic-bezier(.16,1,.3,1),cy .6s cubic-bezier(.16,1,.3,1)}
        .theme-toggle .tt-rays{transform-origin:12px 12px;transition:transform .6s cubic-bezier(.16,1,.3,1),opacity .35s}
        /* dark theme -> moon */
        :root:not([data-theme="light"]) .theme-toggle .tt-svg{transform:rotate(-40deg)}
        :root:not([data-theme="light"]) .theme-toggle .tt-core{transform:scale(1.6)}
        :root:not([data-theme="light"]) .theme-toggle .tt-cut{cx:16.5px;cy:8.5px}
        :root:not([data-theme="light"]) .theme-toggle .tt-rays{transform:scale(.4) rotate(-45deg);opacity:0}
      `}</style>
    </button>
  );
}
