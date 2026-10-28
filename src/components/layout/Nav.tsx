"use client";
import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { Magnetic } from "@/components/ui/interactions";
import ThemeToggle from "./ThemeToggle";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** chapter id -> index into site.nav */
const CHAPTER_TO_LINK: Record<string, number> = { platform: 0, download: 1, pricing: 2 };

/*
 * The logo PNGs (2000x667, transparent) carry generous padding: the artwork occupies
 * x 14..1980, y 144..514. We crop to that box so `--lh` equals the visible glyph height.
 */
const LOGO_CROP: CSSProperties = { width: "calc(var(--lh) * 5.3135)", height: "var(--lh)" };
const LOGO_IMG: CSSProperties = {
  position: "absolute", maxWidth: "none",
  height: "calc(var(--lh) * 1.8027)", width: "auto",
  top: "calc(var(--lh) * -0.3892)", left: "calc(var(--lh) * -0.0378)",
};

export function BrandLogo({ className = "[--lh:28px] sm:[--lh:34px]" }: { className?: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`} style={LOGO_CROP}>
      <img src="/brand/logo-mark.png" alt={site.brand} width={2000} height={667} decoding="async"
        style={LOGO_IMG} className="[:root[data-theme=light]_&]:hidden" />
      <img src="/brand/logo-mark-light.png" alt={site.brand} width={2000} height={667} decoding="async"
        style={LOGO_IMG} className="hidden [:root[data-theme=light]_&]:block" />
    </span>
  );
}

export default function Nav() {
  const chapter = useStore((s) => s.chapter);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [pill, setPill] = useState<{ x: number; w: number; on: boolean }>({ x: 0, w: 0, on: false });
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // hide on scroll down, reveal on scroll up
  useEffect(() => {
    let last = scrollY;
    const onScroll = () => {
      const y = scrollY;
      setScrolled(y > 24);
      const d = y - last;
      if (Math.abs(d) < 6) return;
      setHidden(d > 0 && y > 120 && !openRef.current);
      last = y;
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  // active link indicator (sliding pill + dot)
  useIso(() => {
    const measure = () => {
      const i = CHAPTER_TO_LINK[chapter];
      const el = i === undefined ? null : linkRefs.current[i];
      const list = listRef.current;
      if (!el || !list) { setPill((p) => ({ ...p, on: false })); return; }
      const lr = list.getBoundingClientRect(), r = el.getBoundingClientRect();
      setPill({ x: r.left - lr.left, w: r.width, on: true });
    };
    measure();
    addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => removeEventListener("resize", measure);
  }, [chapter]);

  // close sheet on Esc / desktop resize
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const r = () => innerWidth >= 768 && setOpen(false);
    addEventListener("keydown", k); addEventListener("resize", r);
    return () => { removeEventListener("keydown", k); removeEventListener("resize", r); };
  }, [open]);

  const activeIdx = CHAPTER_TO_LINK[chapter];

  return (
    <header
      className="fixed inset-x-0 top-4 z-[80] px-3 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] sm:px-4"
      style={{ transform: hidden ? "translateY(calc(-100% - 24px))" : "translateY(0)" }}
    >
      <nav
        aria-label="Primary"
        className={`nav-shell relative mx-auto flex max-w-[1100px] items-center justify-between gap-3 rounded-full py-2 pl-4 pr-2 sm:pl-5 ${scrolled ? "is-scrolled" : ""}`}
      >
        <a href="#top" className="relative flex shrink-0 items-center rounded-full py-1" data-cursor="hover">
          <BrandLogo />
        </a>

        <ul ref={listRef} className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
          <span
            aria-hidden="true"
            className="nav-pill pointer-events-none absolute left-0 top-0 h-full rounded-full transition-[transform,width,opacity] duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
            style={{ transform: `translateX(${pill.x}px)`, width: pill.w, opacity: pill.on ? 1 : 0 }}
          >
            <span className="absolute -bottom-[7px] left-1/2 h-[4px] w-[4px] -translate-x-1/2 rounded-full bg-[#6FD0FF] shadow-[0_0_8px_#6FD0FF,0_0_2px_#fff]" />
          </span>
          {site.nav.map((l, i) => (
            <li key={l.href} className="relative">
              <a
                ref={(el) => { linkRefs.current[i] = el; }}
                href={l.href}
                aria-current={activeIdx === i ? "true" : undefined}
                className={`nav-link block rounded-full px-4 py-2 text-[14px] font-semibold tracking-[-0.005em] transition-colors duration-300 ${activeIdx === i ? "text-ink" : "text-ink-muted hover:text-ink"}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="relative flex items-center gap-2">
          <ThemeToggle />
          <span className="hidden sm:inline-block">
            <Magnetic>
              <a href="#pricing" className="btn-primary nav-cta !px-5 !py-2.5 !text-[14px]">{site.pricing.title}</a>
            </Magnetic>
          </span>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav-sheet"
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden="true" className="relative block h-3 w-4">
              <span className={`absolute left-0 top-0 h-[1.5px] w-4 rounded bg-current transition-transform duration-300 ${open ? "translate-y-[5px] rotate-45" : ""}`} />
              <span className={`absolute left-0 top-[5px] h-[1.5px] w-4 rounded bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 top-[10px] h-[1.5px] w-4 rounded bg-current transition-transform duration-300 ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </nav>

      {/* mobile sheet */}
      <div
        id="nav-sheet"
        className={`nav-shell mx-auto mt-2 max-w-[1100px] origin-top overflow-hidden rounded-[22px] p-2 transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(.16,1,.3,1)] md:hidden ${open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-[.98] opacity-0"}`}
      >
        <ul className="relative flex flex-col">
          {site.nav.map((l, i) => (
            <li key={l.href}>
              <a
                href={l.href}
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-[16px] font-semibold ${activeIdx === i ? "nav-pill text-ink" : "text-ink-soft"} hover:bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]`}
              >
                {l.label}
                {activeIdx === i && <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-[#6FD0FF] shadow-[0_0_10px_#6FD0FF]" />}
              </a>
            </li>
          ))}
          <li className="p-2 sm:hidden">
            <a href="#pricing" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="btn-primary w-full justify-center">
              {site.pricing.title}
            </a>
          </li>
        </ul>
      </div>

      <style>{`
        .nav-shell{
          background:var(--nav-bg);
          backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.07),
            inset 0 0 28px -6px color-mix(in oklab,var(--accent) 22%,transparent),
            0 12px 40px -14px rgba(3,4,20,.55);
        }
        nav.nav-shell{transition:box-shadow .5s cubic-bezier(.16,1,.3,1)}
        .nav-shell.is-scrolled{
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.08),
            inset 0 0 32px -6px color-mix(in oklab,var(--accent) 28%,transparent),
            0 18px 50px -14px rgba(3,4,20,.7);
        }
        .nav-shell::before{
          content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;
          background:linear-gradient(100deg,
            color-mix(in oklab,#C9A7FF 55%,transparent) 0%,
            color-mix(in oklab,var(--accent) 14%,transparent) 30%,
            color-mix(in oklab,var(--accent) 10%,transparent) 65%,
            color-mix(in oklab,#6FD0FF 55%,transparent) 100%);
          -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
          -webkit-mask-composite:xor;mask-composite:exclude;
        }
        .nav-pill{
          background:linear-gradient(180deg,color-mix(in oklab,var(--accent) 18%,transparent),color-mix(in oklab,var(--accent) 7%,transparent));
          box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--accent) 26%,transparent),inset 0 1px 0 rgba(255,255,255,.08);
        }
        .nav-link:hover:not([aria-current]){background:color-mix(in oklab,var(--ink) 5%,transparent)}
        :root[data-theme="light"] .nav-shell{box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 10px 30px -14px rgba(40,30,120,.25)}
      `}</style>
    </header>
  );
}
