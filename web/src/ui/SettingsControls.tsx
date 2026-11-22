"use client";

import { useId, useState, type ReactNode } from "react";
import { styleOptions } from "@/game/styles";
import { SegmentedControl } from "@/ui/kit/SegmentedControl";
import { StyleControl } from "@/ui/kit/StyleControl";
import { SwitchRow } from "@/ui/kit/SwitchRow";
import { SPEEDS, useSettings } from "@/ui/settingsStore";
import { useSpeed } from "@/ui/speed";

function SettingsGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2 text-left font-extrabold"
      >
        {title}
        <span className="text-sm font-bold text-ink-soft" aria-hidden>
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && <div className="flex flex-col gap-4 border-t-2 border-snow-2 px-3.5 py-3">{children}</div>}
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
  const { buildingStyle, captions, reduceMotion, defaultSpeed, set } = settings;
  const speedId = useId();
  const motionId = useId();

  return (
    <div className="flex flex-col gap-3">
      <SettingsGroup title="Audio" defaultOpen>
        <SwitchRow label="Sound" on={!settings.muted} onChange={(on) => set({ muted: !on })} />
        {(
          [
            ["masterVolume", "Master volume"],
            ["musicVolume", "Music volume"],
            ["effectsVolume", "Effects volume"],
            ["voiceVolume", "Voice volume"],
          ] as const
        ).map(([key, label]) => (
          <VolumeSlider key={key} label={label} value={settings[key]} onChange={(value) => set({ [key]: value })} />
        ))}
      </SettingsGroup>

      <SettingsGroup title="Display">
        <SwitchRow
          label="Large text"
          on={settings.textSize === "large"}
          onChange={(on) => set({ textSize: on ? "large" : "standard" })}
        />
        <SwitchRow
          label="Low graphics"
          on={settings.graphicsQuality === "low"}
          onChange={(on) => set({ graphicsQuality: on ? "low" : "standard" })}
        />
        <SwitchRow
          label="Pattern aids"
          on={settings.patternAids}
          onChange={(on) => set({ patternAids: on })}
        />
        <div className="flex flex-col gap-2">
          <span id={motionId} className="font-extrabold">
            Reduce motion
          </span>
          <SegmentedControl
            ariaLabel="Reduce motion"
            value={reduceMotion}
            onChange={(next) => set({ reduceMotion: next })}
            options={[
              { value: "system", label: "System", ariaLabel: "Reduce motion system" },
              { value: "on", label: "On", ariaLabel: "Reduce motion on" },
              { value: "off", label: "Off", ariaLabel: "Reduce motion off" },
            ]}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Village">
        <StyleControl
          label="Village buildings"
          value={buildingStyle}
          onChange={(id) => set({ buildingStyle: id })}
          allowed={styleOptions().map((s) => s.id)}
        />
      </SettingsGroup>

      <SettingsGroup title="Gameplay">
        <SwitchRow label="Voice" on={settings.voiceOn} onChange={(on) => set({ voiceOn: on })} />
        <SwitchRow label="Coach tips" on={settings.tips} onChange={(on) => set({ tips: on })} />
        <SwitchRow label="Captions" on={captions} onChange={(v) => set({ captions: v })} />
        <div role="group" aria-labelledby={speedId} className="flex flex-col gap-2">
          <span id={speedId} className="font-extrabold">
            Default speed
          </span>
          <SegmentedControl
            ariaLabel="Default speed"
            value={String(defaultSpeed)}
            onChange={(next) => {
              const speed = Number(next) as (typeof SPEEDS)[number];
              set({ defaultSpeed: speed });
              useSpeed.getState().reset();
            }}
            options={SPEEDS.map((s) => ({ value: String(s), label: `${s}×` }))}
          />
        </div>
      </SettingsGroup>
    </div>
  );
}
