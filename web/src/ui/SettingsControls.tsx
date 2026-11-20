"use client";

import { useId } from "react";
import { cycleReduceMotion, reduceMotionLabel } from "@/ui/motion";
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

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (next: number) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-center justify-between font-extrabold">
        <span>{label}</span>
        <span aria-hidden="true">{value}%</span>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        aria-valuetext={`${value} percent`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-[var(--sign-green)]"
      />
    </div>
  );
}

/** The settings list, shared by the title screen and the Office. */
export function SettingsControls() {
  const settings = useSettings();
  const { captions, reduceMotion, defaultSpeed, set } = settings;
  const speedId = useId();
  return (
    <div className="flex flex-col gap-4">
      <Toggle label="Sound" on={!settings.muted} onChange={on => set({ muted: !on })} />
      {([["masterVolume", "Master volume"], ["musicVolume", "Music volume"], ["effectsVolume", "Effects volume"], ["voiceVolume", "Voice volume"]] as const).map(([key, label]) => (
        <VolumeSlider key={key} label={label} value={settings[key]} onChange={value => set({ [key]: value })} />
      ))}
      <Toggle label="Large text" on={settings.textSize === "large"} onChange={on => set({ textSize: on ? "large" : "standard" })} />
      <Toggle label="Low graphics" on={settings.graphicsQuality === "low"} onChange={on => set({ graphicsQuality: on ? "low" : "standard" })} />
      <Toggle label="Pattern aids" on={settings.patternAids} onChange={on => set({ patternAids: on })} />
      <Toggle label="Voice" on={settings.voiceOn} onChange={on => set({ voiceOn: on })} />
      <Toggle label="Coach tips" on={settings.tips} onChange={on => set({ tips: on })} />
      <Toggle label="Captions" on={captions} onChange={(v) => set({ captions: v })} />
      <div className="flex items-center justify-between gap-3">
        <span className="font-extrabold">Reduce motion</span>
        <button
          type="button"
          aria-label={`Reduce motion ${reduceMotionLabel(reduceMotion)}`}
          onClick={() => set({ reduceMotion: cycleReduceMotion(reduceMotion) })}
          className={`${BTN_SM} min-w-[5.5rem]`}
        >
          {reduceMotionLabel(reduceMotion)}
        </button>
      </div>
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
