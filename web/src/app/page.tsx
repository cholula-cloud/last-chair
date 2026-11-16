import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b1628] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-between px-6 py-16">
        <header className="flex items-center justify-between">
          <p className="text-sm font-medium tracking-[0.2em] text-sky-300/90">
            CHOLULA CLOUD
          </p>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            Preview build
          </span>
        </header>

        <main className="flex flex-col gap-10 py-20">
          <MotionHero />
          <section className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Dutch Hill preview",
                body: "Reopen a foreclosed New England peak in the browser — one lift, one run, tiny skiers you can follow.",
              },
              {
                title: "Day → night → sleep",
                body: "Run the day clock, watch queue and snow, then pick fare and snow & service before the next morning.",
              },
              {
                title: "Build the lift",
                body: "Place the lift top on Ridge, Mid, or Creek and confirm a valid descent before guests ride.",
              },
            ].map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <h2 className="text-lg font-semibold text-white">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {card.body}
                </p>
              </article>
            ))}
          </section>
        </main>

        <footer className="flex flex-col items-start gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Preview slice only — ledgers, talents, founders, and career map are
            on the roadmap, not in this build yet.
          </p>
          <Link
            href="/play"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#e85d26] px-6 text-sm font-semibold text-white transition hover:bg-[#f26f3a]"
          >
            Play preview
          </Link>
        </footer>
      </div>
    </div>
  );
}

function MotionHero() {
  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-sm font-medium text-orange-400">Last Chair</p>
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Dutch Hill day / night loop — preview
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-slate-300">
        A cozy 3D ski-hill tycoon slice: pause or run the day, follow guests,
        tweak tonight&apos;s fare and snow, then sleep and see tomorrow&apos;s
        crowd. Built for phone-first Safari playtests.
      </p>
    </div>
  );
}