"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { flushSave, useGameStore } from "@/game/store";
import { HillSound } from "@/ui/HillSound";
import { TitleScreen } from "@/ui/TitleScreen";

const PlayExperience = dynamic(() => import("@/ui/PlayExperience"), {
  ssr: false,
  loading: () => (
    <div className="display flex h-[100dvh] items-center justify-center bg-sky text-xl text-ink">
      Loading mountain…
    </div>
  ),
});

/** Shows the title screen first. The 3D scene mounts only after the player picks a winter. */
export default function PlayGate() {
  const [playing, setPlaying] = useState(false);
  const [menu, setMenu] = useState<"main" | "load" | "settings">("main");

  return (<>
    <HillSound playing={playing} />
    {!playing ? <TitleScreen initialView={menu} onStart={() => setPlaying(true)} /> : <PlayExperience
      onLeave={(view = "main") => {
        setMenu(view);
        if (!useGameStore.getState().paused) useGameStore.getState().togglePause();
        flushSave();
        setPlaying(false);
      }}
    />}
  </>);
}
