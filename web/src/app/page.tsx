import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-[100svh] flex-col justify-between overflow-x-hidden bg-sky text-ink">
      <Hills />
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 pb-36 pt-[max(2.5rem,env(safe-area-inset-top))] short:pb-24 short:pt-6">
        <div className="panel relative w-full overflow-hidden !bg-sky px-4 pb-8 pt-16 short:pb-6 short:pt-12">
          <Ridges />
          <h1 className="title-outline display relative text-center text-[clamp(3.2rem,16vw,5.2rem)] leading-[0.95] short:text-[3.4rem]">
            Last Chair
          </h1>
        </div>

        <p className="mt-5 max-w-sm text-center text-[1.08rem] font-extrabold leading-snug text-ink short:mt-3">
          Reopen a lost Vermont ski hill for one more winter.
        </p>

        <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5 short:mt-4">
          <Link
            href="/play"
            className="sign sign-btn press block w-full"
          >
            <span className="sign-inner display flex min-h-[48px] items-center justify-center text-[1.55rem]">
              Play
            </span>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/play?view=load"
              className="key press flex min-h-11 items-center justify-center px-3 text-sm font-extrabold [--lift:3px]"
            >
              Load save
            </Link>
            <Link
              href="/play?view=settings"
              className="key press flex min-h-11 items-center justify-center px-3 text-sm font-extrabold [--lift:3px]"
            >
              Settings
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs font-bold text-ink-soft">
          Saves in this browser. Export backups from Load save.
        </p>
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
