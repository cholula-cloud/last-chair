import { formatMoney } from "@/game/format";
import { MT_SHUTTLE_SATURDAY_PAY } from "@/game/mountains/mountTom";
import { mtShuttleOfferOpen } from "@/game/rules";
import type { GameState } from "@/game/state";
import { useGameStore } from "@/game/store";
import { RadioCard } from "@/ui/kit/RadioCard";

export function MountTomShuttleCard({ night }: { night: GameState }) {
  const decide = useGameStore((s) => s.decideMountTomShuttle);
  if (!mtShuttleOfferOpen(night)) return null;

  const primaryClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--key-fill:var(--sign-yellow)] [--lift:3px]";
  const secondaryClass = "key press min-h-12 w-full px-2 text-sm font-extrabold [--lift:3px]";

  return (
    <RadioCard
      title="Whiterock park-and-ride shuttle"
      from="Sloane Prescott, Whiterock"
      action={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={primaryClass}
            onClick={() => decide("accepted")}
          >
            Take {formatMoney(MT_SHUTTLE_SATURDAY_PAY)}/Sat
          </button>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => decide("declined")}
          >
            Keep our lot
          </button>
        </div>
      }
    >
      Whiterock wants twelve parking spots along Route 5 on Saturdays to stage our express coach north. We pay {formatMoney(MT_SHUTTLE_SATURDAY_PAY)} every Saturday, though fewer day-trippers will stop to ski here.
    </RadioCard>
  );
}
