import { canTakeSummitLinkEquity } from "@/game/founders";
import { formatMoney } from "@/game/format";
import { summitLinkOfferOpen } from "@/game/rules";
import type { GameState } from "@/game/state";
import { useGameStore } from "@/game/store";
import { SUMMIT_LINK_PAYMENT } from "@/game/summitLink";
import { FARE_PRICES } from "@/game/types";
import { RadioCard } from "@/ui/kit/RadioCard";

const payment = formatMoney(SUMMIT_LINK_PAYMENT);
const maxFare = formatMoney(FARE_PRICES.balanced);

export function SummitLinkCard({ night }: { night: GameState }) {
  const decision = night.nightRecap?.summitLinkReply;
  if (decision) {
    return (
      <p className="chip mt-3 px-3 py-2 text-sm font-bold" role="status">
        {decision === "accepted"
          ? `Summit Pass deal active. Tickets stay capped at Balanced (${maxFare}).`
          : "You turned down Summit Pass Corp. Dutch Hill sets its own ticket prices."}
      </p>
    );
  }
  if (!summitLinkOfferOpen(night)) return null;

  const blocked = !canTakeSummitLinkEquity(night);
  const buttonClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--lift:4px]";
  return (
    <RadioCard
      title="Summit Pass Corp offer"
      from="Vivian Cho, Summit Pass Corp"
      action={
        <>
          {blocked && (
            <p id="summitlink-founder-lock" className="mb-2 text-sm font-bold">
              Riley will not sign a corporate pass deal. He wants Dutch Hill to stay independent.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`${buttonClass} [--key-fill:var(--sign-yellow)]`}
              disabled={blocked}
              aria-describedby={blocked ? "summitlink-founder-lock" : undefined}
              onClick={() => useGameStore.getState().replyToSummitLink("accepted")}
            >
              Take {payment} (cap tickets)
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => useGameStore.getState().replyToSummitLink("declined")}
            >
              Stay independent
            </button>
          </div>
        </>
      }
    >
      We can wire {payment} to Dutch Hill tonight. In exchange, your lift tickets stay capped at Balanced ({maxFare}) for the rest of the winter.
    </RadioCard>
  );
}