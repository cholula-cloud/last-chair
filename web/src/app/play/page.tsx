"use client";

import dynamic from "next/dynamic";

const PlayGate = dynamic(() => import("@/ui/PlayGate"), {
  ssr: false,
  loading: () => (
    <div className="display flex h-[100dvh] items-center justify-center bg-sky text-xl text-ink">
      Warming up the lifts…
    </div>
  ),
});

export default function PlayPage() {
  return <PlayGate />;
}
