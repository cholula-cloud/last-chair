import Link from "next/link";

const FEATURES = [
  "Dutch Hill, Vermont: one tired surface lift, one trail, a 14-day winter.",
  "Run or pause the day. Follow any skier from car park to lift line to the bottom.",
  "Grow the lodge, build lifts, paint trails and add places for guests to warm up.",
  "Each night, set tomorrow’s fare and how hard the crew works the snow, then sleep.",
  "Six founders, a crew that learns one trick a night, and Route 100 Radio.",
];

export default function Home() {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-sky text-ink">
      <Hills />
      <main className="relative z-10 mx-auto flex max-w-xl flex-col px-4 pb-44 pt-[max(2.5rem,env(safe-area-inset-top))] short:grid short:min-h-[100dvh] short:max-w-none short:grid-cols-2 short:items-center short:gap-8 short:px-[max(2rem,env(safe-area-inset-left))] short:pb-20 short:pt-4">
        <div className="flex flex-col">
          <div className="panel relative overflow-hidden !bg-sky px-2 pb-6 pt-14 short:pt-10">
            <Ridges />
            <h1 className="title-outline display relative text-center text-[clamp(3rem,16vw,5.2rem)] leading-[0.95] short:text-[3.4rem]">
              Last Chair
            </h1>
          </div>
          <p className="mx-auto mt-6 max-w-sm text-center text-[1.05rem] font-bold leading-snug short:mt-3">
            Reopen a lost Vermont ski hill for one more winter. Watch the day,
            make two choices at night, and see who shows up in the morning.
          </p>
          <Link
            href="/play"
            className="sign sign-btn press mx-auto mt-6 block w-full max-w-xs short:mt-4"
          >
            <span className="sign-inner display flex min-h-[46px] items-center justify-center text-[1.5rem]">
              Play
            </span>
          </Link>
        </div>

        <section
          aria-labelledby="in-this-build"
          className="panel mt-9 px-5 py-4 short:mt-0"
        >
          <h2 id="in-this-build" className="display text-[1.4rem]">
            In this build
          </h2>
          <ul className="mt-3 space-y-2.5">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="flex gap-2.5 text-[0.95rem] font-bold leading-snug"
              >
                <span
                  className="mt-[0.5em] size-2 shrink-0 rotate-45 border-2 border-ink bg-sign-green"
                  aria-hidden="true"
                />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t-2 border-snow-2 pt-3 text-[0.85rem] font-bold text-ink-soft">
            An early preview. The career map, the ledger and the other mountains
            are still on the drawing board. Progress saves in this browser.
          </p>
        </section>
      </main>
    </div>
  );
}

/** Two snow hills along the bottom edge: a pale back ridge and a white front one, both outlined in navy. */
function Hills() {
  const back = "M0 46 C60 14 130 18 195 44 C255 68 325 20 400 30";
  const front = "M0 80 C70 52 150 60 220 82 C290 102 350 72 400 62";
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-36 w-full short:h-24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${back} V120 H0Z`} fill="var(--snow-2)" />
      <path
        d={back}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path d={`${front} V120 H0Z`} fill="var(--snow)" />
      <path
        d={front}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Layered ridges behind the title: a pale far range, and a near range with snow caps and pines. */
function Ridges() {
  const far =
    "M0 120 L50 70 L95 105 L150 45 L210 100 L265 60 L320 100 L370 55 L400 85";
  const near =
    "M0 150 L40 115 L85 140 L140 95 L195 135 L250 105 L305 140 L355 110 L400 135";
  const pines = [
    [62, 140],
    [77, 147],
    [300, 152],
    [331, 148],
    [376, 140],
  ];
  return (
    <svg
      viewBox="0 20 400 180"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${far} V200 H0Z`} fill="#c6e6f7" />
      <path d={`${near} V200 H0Z`} fill="#6e9fc7" />
      <path d="M140 95 L127 109 L135 106 L141 112 L147 106 L153 109Z" fill="#fff" />
      <path d="M250 105 L238 114 L245 112 L250 117 L256 112 L262 115Z" fill="#fff" />
      <path
        d={near}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {pines.map(([x, y]) => (
        <path
          key={x}
          d={`M${x - 7} ${y} L${x} ${y - 20} L${x + 7} ${y}Z`}
          fill="var(--sign-green)"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
