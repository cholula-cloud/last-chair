import { formatMoney } from "@/game/format";
import { GROOMER_BORROW_COST } from "@/game/groomerDown";
import type { GroomerDownDecision } from "@/game/groomerDown";
import type { GameState } from "@/game/state";
import { storyBeatCopy, useGameStore } from "@/game/store";
import { RadioCard } from "@/ui/kit/RadioCard";

export function GroomerDownCard({ night }: { night: GameState }) {
  const decide = useGameStore((state) => state.decideGroomerDown);
  if (night.pendingBeat !== "groomer_down") return null;

  const buttonClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--lift:4px]";
  const canBorrow = night.cash >= GROOMER_BORROW_COST;

  return (
    <RadioCard
      title="Groomer down tonight"
      action={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canBorrow}
            className={`${buttonClass} [--key-fill:var(--sign-yellow)] disabled:opacity-50`}
            onClick={() => decide("borrow" satisfies GroomerDownDecision)}
          >
            Borrow town cat ({formatMoney(GROOMER_BORROW_COST)})
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => decide("go_without" satisfies GroomerDownDecision)}
          >
            Guns only tonight
          </button>
        </div>
      }
    >
      {storyBeatCopy("groomer_down")?.radio}
    </RadioCard>
  );
}