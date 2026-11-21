"use client";

import { BUILDING_STYLES, type BuildingStyleId } from "@/game/styles";

export function StylePicker({
  value,
  onChange,
  label = "Style",
  disabled = false,
}: {
  value: BuildingStyleId | string;
  onChange: (styleId: BuildingStyleId) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="mt-3">
      <legend className="text-sm font-bold">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {BUILDING_STYLES.map((style) => {
          const active = value === style.id;
          return (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              className={`key press min-h-11 px-3 text-sm font-extrabold${active ? " ring-2 ring-ink" : ""}`}
              onClick={() => onChange(style.id)}
            >
              {style.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}