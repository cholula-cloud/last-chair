"use client";

import dynamic from "next/dynamic";

const PlayExperience = dynamic(() => import("@/ui/PlayExperience"), {
  ssr: false,
  loading: () => (
    <div className="display flex h-[100dvh] items-center justify-center bg-sky text-xl text-ink">
      Loading mountain…
    </div>
  ),
});

export default function PlayPage() {
  return <PlayExperience />;
}
