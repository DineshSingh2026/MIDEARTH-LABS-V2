const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Film grain overlay, animated at 8fps via steps(). */
export default function Grain() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      <div
        className="grain-layer absolute -inset-[100px] opacity-[.035]"
        style={{ backgroundImage: NOISE, backgroundSize: "220px 220px" }}
      />
      <style>{`
        .grain-layer{animation:grain 1s steps(8) infinite}
        @keyframes grain{
          0%{background-position:0 0}12.5%{background-position:-37px 61px}25%{background-position:83px -22px}
          37.5%{background-position:-71px -95px}50%{background-position:19px 113px}62.5%{background-position:-104px 8px}
          75%{background-position:58px -67px}87.5%{background-position:-13px 41px}100%{background-position:0 0}
        }
        @media (prefers-reduced-motion: reduce){.grain-layer{animation:none}}
        :root[data-theme="light"] .grain-layer{opacity:.015}
      `}</style>
    </div>
  );
}
