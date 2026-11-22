"use client";

import type { BuildingStyleId } from "@/game/styles";
import { StyleControl } from "@/ui/kit/StyleControl";

/** Lodge / venue style picker — wraps StyleControl for AssetInspector. */
export function StylePicker({
  value,
  onChange,
  label = "Style",
  disabled = false,
  allowed,
}: {
  value: BuildingStyleId | string;
  onChange: (styleId: BuildingStyleId) => void;
  label?: string;
  disabled?: boolean;
  allowed?: readonly BuildingStyleId[];
}) {
  return (
    <StyleControl
      className="mt-3"
      value={value}
      onChange={onChange}
      label={label}
      disabled={disabled}
      allowed={allowed}
    />
  );
}
