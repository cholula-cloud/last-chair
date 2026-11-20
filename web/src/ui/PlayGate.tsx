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
      Warming up the lifts…
    </div>
  ),
});

/** Shows the title screen first. The 3D scene mounts only after the player picks a winter. */
export default function PlayGate() {
  const [playing, setPlaying] = useState(false);
  const [coldOpen, setColdOpen] = useState(false);
  const [menu, setMenu] = useState<"main" | "load" | "settings">("main");
  useFeel(playing && !coldOpen);

  return (<>
    {!playing ? <TitleScreen initialView={menu} onStart={opts => {
      setColdOpen(opts?.newWinter === true);
      setPlaying(true);
    }} /> : <div inert={coldOpen}><PlayExperience
      onLeave={(view = "main") => {
        setMenu(view);
        if (!useGameStore.getState().paused) useGameStore.getState().togglePause();
        flushSave();
        setPlaying(false);
      }}
    /></div>}
    {coldOpen && <ColdOpen onDone={() => setColdOpen(false)} />}
  </>);
}
