"use client";

import { useGameStore } from "@/game/store";
import { Sheet } from "@/ui/kit/Sheet";

export function LodgeSheet({ onClose }: { onClose: () => void }) {
  const tier = useGameStore((state) => state.lodgeTier);
  return (
    <Sheet
      title="Dutch Hill Lodge"
      subtitle={`Tier ${tier} · Base Lodge`}
      onClose={onClose}
      closeLabel="Close lodge card"
      focusClose
    >
      <p className="text-sm font-bold text-ink-soft">
        The lodge is your base. Guests pass it on the path from the car park to the lift.
      </p>
    </Sheet>
  );
}
