"use client";

import { BUILDING_STYLES, type BuildingStyleId } from "@/game/styles";
import { SegmentedControl } from "./SegmentedControl";

/** Village / lodge look as a recessed `.seg` track (not a stack of keys). */
export function StyleControl({
  value,
  onChange,
  label = "Style",
  disabled = false,
  allowed,
  className = "",
}: {
  value: BuildingStyleId | string;
  onChange: (styleId: BuildingStyleId) => void;
  label?: string;
  disabled?: boolean;
  allowed?: readonly BuildingStyleId[];
  className?: string;
}) {
  const choices = allowed
    ? BUILDING_STYLES.filter((style) => allowed.includes(style.id))
    : [...BUILDING_STYLES];
  const current = (choices.some((c) => c.id === value) ? value : choices[0]?.id) as BuildingStyleId;
  return (
    <fieldset className={className || undefined}>
      <legend className="mb-1.5 text-sm font-extrabold">{label}</legend>
      <SegmentedControl
        ariaLabel={label}
        value={current}
        onChange={(id) => onChange(id)}
        size={choices.length > 3 ? "sm" : "md"}
        layout={choices.length > 3 ? "grid" : "row"}
        options={choices.map((style) => ({
          value: style.id,
          label: style.label,
          disabled,
        }))}
      />
    </fieldset>
  );
}
