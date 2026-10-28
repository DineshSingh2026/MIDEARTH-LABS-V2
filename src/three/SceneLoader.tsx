"use client";
import { Component, ReactNode } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

/** Keeps a WebGL/postprocessing failure from taking down the page; falls back to the poster. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn("3D scene disabled:", e instanceof Error ? e.message : e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Fixed full-viewport canvas behind the DOM. Falls back to a static arena poster without WebGL / with reduced motion. */
export default function SceneLoader() {
  const webgl = useStore((s) => s.webgl);
  const reduced = useStore((s) => s.reducedMotion);
  const theme = useStore((s) => s.theme);
  const poster = (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 68% 45%, rgba(91,46,224,.35), transparent 70%), radial-gradient(40% 40% at 20% 80%, rgba(31,111,214,.25), transparent 70%)" }} />
      {/* static arena: hex field glowing out from the runtime core */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='97' viewBox='0 0 56 97'%3E%3Cpath d='M28 0l28 16v32L28 64 0 48V16zM28 64v33' fill='none' stroke='${theme === "light" ? "%235B2EE0" : "%23A98CFF"}' stroke-opacity='.35'/%3E%3C/svg%3E")`,
          backgroundSize: "56px 97px",
          maskImage: "radial-gradient(45% 50% at 68% 50%, #000, transparent 75%)",
          WebkitMaskImage: "radial-gradient(45% 50% at 68% 50%, #000, transparent 75%)",
        }}
      />
      <div className="absolute left-[68%] top-[45%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-3xl" style={{ background: "linear-gradient(135deg,#C9A7FF,#6FD0FF 50%,#E07BFF)", filter: "blur(28px)", opacity: 0.55 }} />
    </div>
  );
  if (!webgl || reduced) return poster;
  return (
    <SceneBoundary fallback={poster}>
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none">
        <Scene />
      </div>
    </SceneBoundary>
  );
}
