import Link from "next/link";

export default function PlayPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0b1628] px-6 text-center text-slate-100">
      <p className="text-sm font-medium tracking-widest text-sky-300/80">
        PLAY PREVIEW
      </p>
      <h1 className="max-w-xl text-3xl font-semibold text-white">
        Vertical slice coming in Phase 1
      </h1>
      <p className="max-w-lg text-slate-300">
        React Three Fiber mountain scene, day loop, and guest simulation land
        next. Design docs are in the repo <code className="text-sky-200">docs/</code>{" "}
        folder.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-orange-400 underline-offset-4 hover:underline"
      >
        ← Back to home
      </Link>
    </div>
  );
}
