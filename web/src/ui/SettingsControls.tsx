"use client";

import { useId } from "react";
import { SPEEDS, useSettings } from "@/ui/settingsStore";
import { useSpeed } from "@/ui/speed";

const BTN_SM = "key key-sm press min-h-11 px-3 text-[0.95rem] font-extrabold";

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-extrabold">{label}</span>
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`${BTN_SM} w-20`}
      >
        {on ? "On" : "Off"}
      </button>
    </div>
  );
}

/** The settings list, shared by the title screen and the Office. */
export function SettingsControls() {
  const { voiceVolume, voiceOn, tips, captions, reduceMotion, defaultSpeed, set } = useSettings();
  const volumeId = useId();
  const speedId = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={volumeId} className="flex items-center justify-between font-extrabold">
          <span>Voice volume</span>
          <span aria-hidden="true">{voiceVolume}%</span>
        </label>
        <input
          id={volumeId}
          type="range"
          min={0}
          max={100}
          step={5}
          value={voiceVolume}
          aria-valuetext={`${voiceVolume} percent`}
          onChange={(e) => set({ voiceVolume: Number(e.target.value) })}
          className="h-11 w-full accent-[var(--sign-green)]"
        />
      </div>
      <Toggle label="Voice" on={voiceOn} onChange={(v) => set({ voiceOn: v })} />
      <Toggle label="Coach tips" on={tips} onChange={(v) => set({ tips: v })} />
      <Toggle label="Captions" on={captions} onChange={(v) => set({ captions: v })} />
      <Toggle label="Reduce motion" on={reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
      <div role="group" aria-labelledby={speedId} className="flex flex-col gap-2">
        <span id={speedId} className="font-extrabold">Default speed</span>
        <div className="flex gap-2">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={defaultSpeed === s}
              aria-label={`${s} times speed`}
              onClick={() => {
                set({ defaultSpeed: s });
                useSpeed.getState().reset();
              }}
              className={`${BTN_SM} flex-1`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
