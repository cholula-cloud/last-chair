"use client";

/** Label + sliding switch (44 px target). Replaces On/Off key buttons in Settings. */
export function SwitchRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-extrabold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`switch press min-h-11 min-w-[3.25rem] shrink-0 ${on ? "switch-on" : ""}`}
      >
        <span className="switch-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
