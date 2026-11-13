"use client";

import dynamic from "next/dynamic";

const PlayExperience = dynamic(() => import("@/ui/PlayExperience"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[100dvh] items-center justify-center bg-[#0b1628] text-sm text-slate-300">
      Loading mountain…
    </div>
  ),
});

export default function PlayPage() {
  return <PlayExperience />;
}
