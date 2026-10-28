const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function LaptopIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden {...common}>
      <rect x="11" y="13" width="34" height="23" rx="2.5" />
      <rect x="14.5" y="16.5" width="27" height="16" rx="1" opacity=".45" />
      <path d="M5 40h46l-2.5 4h-41z" />
      <path d="M24 42h8" opacity=".6" />
    </svg>
  );
}
export function MonitorIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden {...common}>
      <rect x="7" y="10" width="42" height="28" rx="2.5" />
      <path d="M7 16h42" opacity=".6" />
      <rect x="12" y="20" width="9" height="7" rx="1" opacity=".55" />
      <rect x="23" y="20" width="9" height="7" rx="1" opacity=".55" />
      <rect x="12" y="29" width="9" height="5" rx="1" opacity=".55" />
      <path d="M24 38l-2 7h12l-2-7M18 45h20" />
    </svg>
  );
}
export function AndroidIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden {...common}>
      <rect x="16" y="5" width="24" height="46" rx="4" />
      <circle cx="28" cy="9.5" r=".9" fill="currentColor" />
      <path d="M22.5 25a5.5 5.5 0 0 1 11 0z" opacity=".75" />
      <path d="M23.5 20.5l-1.5-2M32.5 20.5l1.5-2" opacity=".75" />
      <path d="M22.5 27h11v6a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5z" opacity=".75" />
      <path d="M24 46h8" opacity=".6" />
    </svg>
  );
}
export function IPhoneIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden {...common}>
      <rect x="16" y="4" width="24" height="48" rx="6" />
      <rect x="24" y="7.5" width="8" height="2.6" rx="1.3" fill="currentColor" opacity=".7" />
      <rect x="19.5" y="14" width="7" height="7" rx="2" opacity=".55" />
      <rect x="29.5" y="14" width="7" height="7" rx="2" opacity=".55" />
      <rect x="19.5" y="24" width="7" height="7" rx="2" opacity=".55" />
      <rect x="29.5" y="24" width="7" height="7" rx="2" opacity=".55" />
      <path d="M24 48.5h8" />
    </svg>
  );
}

/* ---------- Large device illustrations (decorative) ---------- */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3A3F72" />
        <stop offset="1" stopColor="#14173A" />
      </linearGradient>
      <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1B1450" />
        <stop offset=".6" stopColor="#0C1440" />
        <stop offset="1" stopColor="#0A2A5C" />
      </linearGradient>
      <linearGradient id={`${id}-acc`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#7C5CFF" />
        <stop offset="1" stopColor="#6FD0FF" />
      </linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#C9A7FF" stopOpacity=".9" />
        <stop offset=".5" stopColor="#C9A7FF" stopOpacity=".1" />
        <stop offset="1" stopColor="#6FD0FF" stopOpacity=".6" />
      </linearGradient>
    </defs>
  );
}

/** Abstract chat UI: agent bubbles + an approval card. */
function ChatUI({ x, y, w, h, id, compact = false }: { x: number; y: number; w: number; h: number; id: string; compact?: boolean }) {
  const p = compact ? 6 : 8;
  const bw = w - p * 2;
  return (
    <g>
      <rect x={x + p} y={y + p} width={bw * 0.62} height={compact ? 9 : 10} rx="5" fill="#fff" opacity=".12" />
      <rect x={x + w - p - bw * 0.55} y={y + p + (compact ? 14 : 16)} width={bw * 0.55} height={compact ? 9 : 10} rx="5" fill={`url(#${id}-acc)`} opacity=".9" />
      <rect x={x + p} y={y + p + (compact ? 28 : 32)} width={bw * 0.75} height={compact ? 9 : 10} rx="5" fill="#fff" opacity=".12" />
      <rect x={x + p} y={y + h - p - (compact ? 22 : 26)} width={bw} height={compact ? 22 : 26} rx="6" fill="#fff" fillOpacity=".06" stroke="#A98CFF" strokeOpacity=".5" />
      <rect x={x + p + 6} y={y + h - p - (compact ? 14 : 17)} width={bw * 0.3} height="7" rx="3.5" fill="#10A37F" opacity=".85" />
      <rect x={x + p + 10 + bw * 0.3} y={y + h - p - (compact ? 14 : 17)} width={bw * 0.3} height="7" rx="3.5" fill="#fff" opacity=".18" />
      <circle className="blip" cx={x + w - p - 4} cy={y + p + 4} r="2.4" fill="#6FD0FF" />
    </g>
  );
}

export function LaptopArt() {
  const id = "dl-mac";
  return (
    <svg width="230" height="140" viewBox="0 0 230 140" aria-hidden>
      <Defs id={id} />
      <rect x="35" y="8" width="160" height="104" rx="8" fill={`url(#${id}-body)`} stroke={`url(#${id}-edge)`} />
      <rect x="41" y="14" width="148" height="92" rx="4" fill={`url(#${id}-screen)`} />
      <rect x="41" y="14" width="40" height="92" rx="4" fill="#fff" opacity=".04" />
      {[0, 1, 2, 3].map((k) => <circle key={k} cx="53" cy={28 + k * 16} r="5" fill={k === 1 ? `url(#${id}-acc)` : "#fff"} opacity={k === 1 ? 1 : 0.15} />)}
      <ChatUI x={83} y={14} w={106} h={92} id={id} />
      <path d="M8 114h214l-10 14a6 6 0 0 1-5 2.5H23a6 6 0 0 1-5-2.5z" fill={`url(#${id}-body)`} stroke={`url(#${id}-edge)`} />
      <rect x="98" y="114" width="34" height="4" rx="2" fill="#000" opacity=".35" />
    </svg>
  );
}
export function MonitorArt() {
  const id = "dl-win";
  return (
    <svg width="220" height="150" viewBox="0 0 220 150" aria-hidden>
      <Defs id={id} />
      <rect x="10" y="6" width="200" height="118" rx="8" fill={`url(#${id}-body)`} stroke={`url(#${id}-edge)`} />
      <rect x="16" y="12" width="188" height="106" rx="4" fill={`url(#${id}-screen)`} />
      <rect x="40" y="22" width="140" height="84" rx="5" fill="#0B0F2C" stroke="#A98CFF" strokeOpacity=".35" />
      <rect x="40" y="22" width="140" height="12" rx="5" fill="#fff" opacity=".07" />
      {[0, 1, 2].map((k) => <rect key={k} x={164 - k * 9} y="26" width="5" height="4" rx="1" fill="#fff" opacity=".4" />)}
      <ChatUI x={40} y={34} w={140} h={72} id={id} compact />
      <path d="M92 124l-6 16h48l-6-16" fill={`url(#${id}-body)`} stroke={`url(#${id}-edge)`} />
      <rect x="70" y="139" width="80" height="5" rx="2.5" fill={`url(#${id}-body)`} stroke={`url(#${id}-edge)`} />
    </svg>
  );
}
function PhoneArt({ id, ios }: { id: string; ios: boolean }) {
  return (
    <svg width="96" height="150" viewBox="0 0 96 150" aria-hidden>
      <Defs id={id} />
      <rect x="6" y="3" width="84" height="144" rx={ios ? 16 : 10} fill={`url(#${id}-body)`} stroke={`url(#${id}-edge)`} />
      <rect x="11" y="8" width="74" height="134" rx={ios ? 12 : 7} fill={`url(#${id}-screen)`} />
      {ios ? <rect x="36" y="12" width="24" height="7" rx="3.5" fill="#000" /> : <circle cx="48" cy="14" r="3" fill="#000" />}
      <ChatUI x={11} y={24} w={74} h={100} id={id} compact />
      <rect x={ios ? 34 : 30} y="133" width={ios ? 28 : 36} height="3" rx="1.5" fill="#fff" opacity=".35" />
    </svg>
  );
}
export const AndroidArt = () => <PhoneArt id="dl-android" ios={false} />;
export const IPhoneArt = () => <PhoneArt id="dl-ios" ios />;
