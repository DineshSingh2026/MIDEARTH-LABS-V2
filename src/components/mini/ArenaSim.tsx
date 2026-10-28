"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

const NAMES = ["agent_a", "agent_b", "agent_c"];
const WIN = 5;
const TOKEN_D = "#FFD27A", TOKEN_L = "#D9822B";

type Agent = { x: number; y: number; vx: number; vy: number; sp: number; k: number; ph: number; flash: number; alpha: number; trail: number[] };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; c: string };

/** 01 · Autonomous agents chase a token in a tiny arena: comet trails, a burst on each score, a live scoreboard. */
export default function ArenaSim({ running, reduced, accent = "#A98CFF" }: { running: boolean; reduced: boolean; accent?: string }) {
  const L = useStore((s) => s.theme) === "light";
  const COLORS = L ? [accent, "#0E8FC7", "#D63F8C"] : [accent, "#6FD0FF", "#FF7AB6"];
  const TOKEN = L ? TOKEN_L : TOKEN_D;
  const TOK_RGB = L ? "217,130,43" : "255,210,122";
  const ref = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState<number[]>([0, 0, 0]);
  const [round, setRound] = useState(1);
  const [lead, setLead] = useState<number | null>(null);
  const st = useRef({ w: 0, h: 0, agents: [] as Agent[], sparks: [] as Spark[], rings: [] as { x: number; y: number; t: number; c: string }[], tok: { x: 0, y: 0, t: 0 }, score: [0, 0, 0], round: 1, pause: 0, time: 0, init: false });

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const S = st.current;
    const pad = 14, top = 38;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const placeTok = () => { S.tok = { x: rnd(pad + 16, S.w - pad - 16), y: rnd(top + 12, S.h - pad - 12), t: 0 }; };
    const spawn = () => {
      S.agents = COLORS.map((_, i) => ({
        x: rnd(pad + 10, S.w - pad - 10), y: rnd(top + 6, S.h - pad - 6), vx: 0, vy: 0,
        sp: 70 + i * 8 + rnd(0, 14), k: 1.4 + rnd(0, 1.8), ph: rnd(0, 6.28), flash: 0, alpha: 0, trail: [],
      }));
      placeTok();
    };
    const burst = (x: number, y: number, col: string) => {
      for (let j = 0; j < 22; j++) { const a = rnd(0, Math.PI * 2), s = rnd(30, 120); S.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: j % 3 === 0 ? TOKEN : col }); }
      S.rings.push({ x, y, t: 0, c: col });
    };

    const draw = () => {
      const { w, h } = S;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      // arena: centre line + circle
      ctx.strokeStyle = L ? "rgba(91,46,224,.22)" : "rgba(180,160,255,.18)"; ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(w / 2, top); ctx.lineTo(w / 2, h - 8); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(w / 2, (h + top) / 2, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.globalCompositeOperation = L ? "source-over" : "lighter";
      // token
      const tk = S.tok; const sc = Math.min(1, tk.t * 4); const pulse = 1 + Math.sin(S.time * 6) * 0.18;
      if (S.pause <= 0) {
        const g = ctx.createRadialGradient(tk.x, tk.y, 0, tk.x, tk.y, 22 * sc);
        g.addColorStop(0, `rgba(${TOK_RGB},${L ? .3 : .45})`); g.addColorStop(1, `rgba(${TOK_RGB},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tk.x, tk.y, 22 * sc, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(${TOK_RGB},${0.5 * sc})`; ctx.beginPath(); ctx.arc(tk.x, tk.y, 10 * pulse * sc, 0, Math.PI * 2); ctx.stroke();
        ctx.save(); ctx.translate(tk.x, tk.y); ctx.rotate(Math.PI / 4 + S.time * 1.4); ctx.fillStyle = TOKEN;
        const s = 3.6 * sc; ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore();
      }
      // comet trails + agents
      S.agents.forEach((a, i) => {
        const col = COLORS[i]; const tr = a.trail; const n = tr.length / 2;
        ctx.lineCap = "round";
        for (let j = 1; j < n; j++) {
          const f = j / n;
          ctx.strokeStyle = col; ctx.globalAlpha = a.alpha * f * f * 0.85; ctx.lineWidth = 0.5 + 4.2 * f;
          ctx.beginPath(); ctx.moveTo(tr[(j - 1) * 2], tr[(j - 1) * 2 + 1]); ctx.lineTo(tr[j * 2], tr[j * 2 + 1]); ctx.stroke();
        }
        ctx.globalAlpha = a.alpha;
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 16);
        g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = a.alpha * 0.55; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, 16, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a.alpha; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(a.x, a.y, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(a.x, a.y, 4.6, 0, Math.PI * 2); ctx.stroke();
      });
      // shockwave rings + sparks
      S.rings.forEach((r) => { ctx.globalAlpha = Math.max(0, 1 - r.t / 0.6); ctx.strokeStyle = r.c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x, r.y, 4 + r.t * 70, 0, Math.PI * 2); ctx.stroke(); });
      S.sparks.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4 * p.life + 0.4, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    };

    const step = (dt: number) => {
      S.time += dt; S.tok.t += dt;
      S.sparks.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt * 1.6; });
      S.sparks = S.sparks.filter((p) => p.life > 0);
      S.rings.forEach((r) => (r.t += dt)); S.rings = S.rings.filter((r) => r.t < 0.6);
      if (S.pause > 0) {
        S.pause -= dt;
        if (S.pause <= 0) { S.score = [0, 0, 0]; S.round++; setScore([0, 0, 0]); setRound(S.round); setLead(null); spawn(); }
      }
      const tk = S.tok;
      S.agents.forEach((a, i) => {
        a.alpha = Math.min(1, a.alpha + dt * 2); a.flash = Math.max(0, a.flash - dt * 2.2);
        const dx = tk.x - a.x, dy = tk.y - a.y; const d = Math.hypot(dx, dy) || 1;
        const wob = Math.sin(S.time * 2 + a.ph) * 0.6; const cs = Math.cos(wob), sn = Math.sin(wob);
        const ux = dx / d, uy = dy / d;
        let tx = (ux * cs - uy * sn) * a.sp, ty = (ux * sn + uy * cs) * a.sp;
        if (S.pause > 0) { tx *= -0.35; ty *= -0.35; }
        S.agents.forEach((b) => {
          if (b === a) return; const ox = a.x - b.x, oy = a.y - b.y, od = Math.hypot(ox, oy);
          if (od > 0 && od < 24) { tx += (ox / od) * 80; ty += (oy / od) * 80; }
        });
        const kk = Math.min(1, a.k * dt); a.vx += (tx - a.vx) * kk; a.vy += (ty - a.vy) * kk;
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < pad) { a.x = pad; a.vx = Math.abs(a.vx); } if (a.x > S.w - pad) { a.x = S.w - pad; a.vx = -Math.abs(a.vx); }
        if (a.y < top) { a.y = top; a.vy = Math.abs(a.vy); } if (a.y > S.h - pad) { a.y = S.h - pad; a.vy = -Math.abs(a.vy); }
        a.trail.push(a.x, a.y); if (a.trail.length > 56) a.trail.splice(0, 2);
        if (S.pause <= 0 && d < 9 && tk.t > 0.25) {
          S.score[i]++; a.flash = 1; setScore([...S.score]); burst(tk.x, tk.y, COLORS[i]);
          const mx = Math.max(...S.score); setLead(S.score.filter((v) => v === mx).length === 1 ? S.score.indexOf(mx) : null);
          if (S.score[i] >= WIN) S.pause = 1.6;
          placeTok();
        }
      });
    };

    const resize = () => {
      const r = c.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      S.w = r.width; S.h = r.height; c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!S.init) { S.init = true; spawn(); if (reduced) S.agents.forEach((a) => (a.alpha = 1)); }
      draw();
    };
    const ro = new ResizeObserver(resize); ro.observe(c); resize();

    let raf = 0; let last = 0;
    const loop = (t: number) => { const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t; step(dt); draw(); raf = requestAnimationFrame(loop); };
    if (running && !reduced) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reduced, accent, L]);

  return (
    <div className="relative h-full w-full" aria-hidden>
      <canvas ref={ref} className="block h-full w-full" />
      {/* scoreboard */}
      <div className="mono pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5 border-b px-2.5 py-1.5 text-[10px]"
        style={{ borderColor: "color-mix(in oklab, var(--ac, #A98CFF) 20%, transparent)", background: L ? "linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.7))" : "linear-gradient(180deg, rgba(6,8,26,.75), rgba(6,8,26,.35))" }}>
        {score.map((s, i) => (
          <span key={i} className="flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors duration-300"
            style={{ background: lead === i ? `color-mix(in oklab, ${COLORS[i]} 18%, transparent)` : "transparent" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[i], boxShadow: `0 0 6px ${COLORS[i]}` }} />
            <span className="hidden sm:inline" style={{ color: L ? "var(--ink-soft)" : "#C2C8EA" }}>{NAMES[i]}</span>
            <span className="ml-auto flex gap-[3px]">
              {Array.from({ length: WIN }).map((_, k) => <span key={k} className="h-[5px] w-[5px] rounded-[1px]" style={{ background: k < s ? COLORS[i] : "rgba(160,150,220,.2)", boxShadow: k < s ? `0 0 4px ${COLORS[i]}` : "none" }} />)}
            </span>
            <b className="w-[1.2ch] text-right tabular-nums" style={{ color: L ? "var(--ink)" : "#F1F3FF" }}>{s}</b>
          </span>
        ))}
        <span className="pl-1 uppercase tracking-[.14em]" style={{ color: L ? "var(--ink-faint)" : "#8D95BE" }}>r{round}</span>
      </div>
    </div>
  );
}
