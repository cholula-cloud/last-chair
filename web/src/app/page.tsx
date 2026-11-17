import Link from "next/link";

const FEATURES = [
  "Dutch Hill, Vermont: one tired surface lift, one trail, a 14-day winter.",
  "Run or pause the day. Follow any skier from car park to lift line to the bottom.",
  "Build a double chair, a lodge, a café, a shop and snow guns when cash allows.",
  "Each night, set tomorrow’s fare and how hard the crew works the snow, then sleep.",
  "Six founders, a crew that learns one trick a night, and Route 100 Radio.",
];

export default function Home() {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-navy text-paper short:grid short:grid-cols-2 short:items-start">
      <NightHill />
      <main className="relative mx-auto -mt-6 flex max-w-xl flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:-mt-10 short:mt-0 short:pr-[max(1rem,env(safe-area-inset-right))] short:pt-8">
        <h1
          className="serif text-center text-[4.2rem] font-semibold leading-[0.9] tracking-[-0.02em] text-paper drop-shadow-[0_3px_12px_rgb(11_22_40/0.9)] sm:text-[5.5rem] short:text-[3.6rem]"
          style={{ fontVariationSettings: '"SOFT" 100, "opsz" 144, "WONK" 1' }}
        >
          Last Chair
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-center text-[1.05rem] leading-relaxed text-[#cdd5e0]">
          Reopen a lost Vermont ski hill for one more winter. Watch the day,
          make two choices at night, and see who shows up in the morning.
        </p>
        <Link
          href="/play"
          className="press btn-primary mx-auto mt-6 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl text-[1.15rem] font-bold"
        >
          Play
        </Link>

        <section
          aria-labelledby="in-this-build"
          className="paper paper-tilt mt-10 rounded-2xl px-5 py-4"
        >
          <h2
            id="in-this-build"
            className="plate inline-block rounded-[5px] px-2.5 py-0.5 text-[0.95rem]"
          >
            In this build
          </h2>
          <ul className="mt-3 space-y-2.5">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="flex gap-2.5 text-[0.93rem] leading-snug text-ink"
              >
                <span
                  className="mt-[0.45em] size-1.5 shrink-0 rotate-45 bg-pine"
                  aria-hidden="true"
                />
                {f}
              </li>
            ))}
          </ul>
          <p className="stitch mt-4 pt-3 text-[0.82rem] text-ink-soft">
            An early preview. The career map, the ledger and the other mountains
            are still on the drawing board. Progress saves in this browser.
          </p>
        </section>
      </main>
    </div>
  );
}

/** Title illustration: Dutch Hill at dusk, drawn inline. */
function NightHill() {
  // Deterministic scatter of pines over the hill, keeping the trail and lift line clear.
  const hillTop = (x: number) => 72 + Math.abs(x - 205) * 0.38;
  const trees: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < 140; i++) {
    const x = ((i * 37 + (i % 3) * 11) % 410) - 5;
    const y = hillTop(x) + 14 + ((i * 53) % 110);
    const trailX = 205 - (y - 72) * 0.3;
    const nearTrail = Math.abs(x - trailX) < 20 + (y - 72) * 0.08;
    const nearLift = Math.abs(x - (214 + (y - 80) * 0.16)) < 6;
    const nearLodge = x > 222 && x < 286 && y > 176;
    if (y < 214 && !nearTrail && !nearLift && !nearLodge) {
      trees.push({ x, y, s: 0.55 + (y - 70) / 260 + ((i * 7) % 4) / 20 });
    }
  }
  trees.sort((a, b) => a.y - b.y);
  const stars = Array.from({ length: 30 }, (_, i) => ({
    x: (i * 97) % 400,
    y: 6 + ((i * 41) % 60),
    r: i % 5 === 0 ? 1.1 : 0.6,
  }));
  return (
    <svg
      viewBox="0 0 400 230"
      preserveAspectRatio="xMidYMax slice"
      className="block h-[46dvh] max-h-[460px] min-h-[260px] w-full short:sticky short:top-0 short:h-[100dvh] short:max-h-none short:min-h-0"
      role="img"
      aria-label="Dutch Hill at dusk: a snowy hill with a lift line, a trail cut through the pines, and a red lodge with lit windows"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081226" />
          <stop offset="1" stopColor="#33497a" />
        </linearGradient>
        <linearGradient id="snow" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="#c9d5ee" />
          <stop offset="0.5" stopColor="#f4f7fb" />
          <stop offset="1" stopColor="#a9b9de" />
        </linearGradient>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1628" stopOpacity="0" />
          <stop offset="1" stopColor="#0b1628" />
        </linearGradient>
        <radialGradient id="glow">
          <stop offset="0" stopColor="#ffc46b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc46b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="230" fill="url(#sky)" />
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#f4efe4"
          opacity={0.7}
        />
      ))}
      <path
        d="M0 118 C40 104 70 96 100 104 C130 112 150 92 180 96 C230 100 250 84 290 90 C330 96 360 108 400 104 V230 H0z"
        fill="#22355a"
      />
      <path
        d="M-5 150 C50 136 100 120 140 102 C170 86 190 74 205 72 C222 74 245 88 268 102 C305 122 350 134 405 142 V230 H-5z"
        fill="url(#snow)"
      />
      <path
        d="M203 74 C199 100 190 124 182 150 C176 172 172 190 170 214 L196 214 C196 192 200 170 206 150 C212 126 213 100 209 74z"
        fill="#ffffff"
        opacity={0.85}
      />
      <path d="M214 80 L234 206" stroke="#2b3138" strokeWidth={0.8} />
      {[0.12, 0.38, 0.64, 0.9].map((t) => {
        const x = 214 + 20 * t;
        const y = 80 + 126 * t;
        return (
          <path
            key={t}
            d={`M${x} ${y} v8 M${x - 3} ${y} h6`}
            stroke="#3a4250"
            strokeWidth={1.3}
          />
        );
      })}
      {trees.map((t, i) => (
        <g
          key={i}
          transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) scale(${t.s.toFixed(2)})`}
        >
          <path d="M0 -15 L6 -4 L-6 -4z M0 -9 L8 4 L-8 4z" fill="#1f4a3d" />
          <path
            d="M0 -15 L3 -9.5 L-3 -9.5z M0 -9 L3.6 -3 L-3.6 -3z"
            fill="#eef3fa"
          />
        </g>
      ))}
      <ellipse cx="258" cy="204" rx="44" ry="14" fill="url(#glow)" />
      <g transform="translate(238 188)">
        <rect x="0" y="0" width="40" height="17" fill="#a8382b" />
        <path d="M-4 1 L20 -13 L44 1z" fill="#f4f7fb" />
        <rect x="5" y="5" width="6" height="6" fill="#ffc46b" />
        <rect x="17" y="5" width="6" height="6" fill="#ffc46b" />
        <rect x="29" y="5" width="6" height="6" fill="#ffc46b" />
        <rect x="31" y="-11" width="4" height="8" fill="#8b8682" />
      </g>
      <rect y="170" width="400" height="52" fill="url(#fade)" />
      <rect y="221" width="400" height="20" fill="#0b1628" />
    </svg>
  );
}
