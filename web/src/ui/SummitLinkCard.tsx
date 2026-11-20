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
          ? `Abominable Snowglomerate paid ${payment}. Tickets are capped at ${maxFare} this winter.`
          : "You turned down Abominable Snowglomerate. Dutch Hill sets its own fares."}
      </p>
    );
  }
  if (!summitLinkOfferOpen(night)) return null;

  const blocked = !canTakeSummitLinkEquity(night);
  const buttonClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--lift:4px]";
  return (
    <RadioCard
      title="Vivian Cho’s Abominable Snowglomerate offer"
      from="Vivian Cho, Abominable Snowglomerate"
      action={
        <>
          {blocked && <p id="summitlink-founder-lock" className="mb-2 text-sm font-bold">Riley won’t sign it. Says he’d rather rebuild the T-bar twice.</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`${buttonClass} [--key-fill:var(--sign-yellow)]`}
              disabled={blocked}
              aria-describedby={blocked ? "summitlink-founder-lock" : undefined}
              onClick={() => useGameStore.getState().replyToSummitLink("accepted")}
            >
              Accept {payment}
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
      We love what you’re building up here. One day every chair in New England will run on a single pass, and we’d love yours on the map. We’ll put {payment} into Dutch Hill tonight if tickets stay at Balanced ({maxFare}) or below for the rest of the winter.
    </RadioCard>
  );
}
