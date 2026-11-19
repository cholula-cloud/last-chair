"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { flushSave, useGameStore } from "@/game/store";
import { ColdOpen } from "@/ui/ColdOpen";
import { TitleScreen } from "@/ui/TitleScreen";
import { useFeel } from "@/ui/feel";

const PlayExperience = dynamic(() => import("@/ui/PlayExperience"), {
  ssr: false,
  loading: () => (
    <div className="display flex h-[100dvh] items-center justify-center bg-sky text-xl text-ink">
      Loading mountain…
    </div>
  ),
});

/**
 * Shows the title screen first. The 3D scene mounts after the player picks a winter and loads
 * under the cold open, which plays once after New winter and never after Continue or Load.
 */
export default function PlayGate() {
  const [playing, setPlaying] = useState(false);
  const [coldOpen, setColdOpen] = useState(false);
  useFeel();

  if (!playing) {
    return (
      <TitleScreen
        onStart={(opts) => {
          setColdOpen(opts?.newWinter === true);
          setPlaying(true);
        }}
      />
    );
  }
  return (
    <>
      <div inert={coldOpen}>
        <PlayExperience
          onLeave={() => {
            useGameStore.setState({ paused: true });
            flushSave();
            setPlaying(false);
          }}
        />
      </div>
      {coldOpen && <ColdOpen onDone={() => setColdOpen(false)} />}
    </>
  );
}
