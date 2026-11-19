"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { COLD_OPEN } from "./coldOpen";
import { Sheet } from "./kit/Sheet";
import { useSettings } from "./settingsStore";

const directory = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/opening/";

export function ColdOpen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLAudioElement>(null);
  const { muted, masterVolume, voiceVolume, captions, set } = useSettings();
  const card = COLD_OPEN[index];
  const volume = muted ? 0 : masterVolume * voiceVolume / 10000;
  useEffect(() => {
    const audio = player.current;
    if (!audio) return;
    audio.volume = volume;
    if (volume > 0) void audio.play().catch(() => {});
    return () => audio.pause();
  }, [index, volume]);

  function listen() {
    const audio = player.current;
    if (!audio) return;
    if (playing) return audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }

  return (
    <Sheet modal z="z-50" title="Route 100 Radio" subtitle="Maris Shaw · Dutch Hill, Vermont"
      footer={<div className="flex gap-2">
        <button type="button" className="key min-h-11 px-3" onClick={onDone}>Skip opening</button>
        <button type="button" className="sign min-h-11 flex-1 px-3 font-bold" onClick={() => {
          if (index + 1 === COLD_OPEN.length) onDone();
          else setIndex(index + 1);
        }}>{index + 1 === COLD_OPEN.length ? "Choose your founder" : "Next card"}</button>
      </div>}>
      <div aria-live="polite" aria-atomic="true">
        <Image unoptimized src={directory + card.id + ".webp"} width={887} height={443} alt={card.alt}
          className="w-full rounded-lg border-2 border-ink object-cover short:max-h-32" />
        <h3 className="display mt-2 text-xl">{card.title} <span className="text-base">({index + 1} of 4)</span></h3>
        {captions && <p className="mt-1 font-bold">{card.line}</p>}
      </div>
      <audio ref={player} src={directory + card.id + ".mp3"} preload="auto"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="key min-h-11 px-3" disabled={volume === 0} onClick={listen}>
          {volume === 0 ? "Voice off" : playing ? "Pause voice" : "Hear Maris"}
        </button>
        <button type="button" className="key min-h-11 px-3" aria-pressed={captions} onClick={() => set({ captions: !captions })}>
          Captions {captions ? "on" : "off"}
        </button>
      </div>
    </Sheet>
  );
}
