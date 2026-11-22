import { canTakeSummitLinkEquity } from "@/game/founders";
import { formatOperatorText } from "@/game/content";
import { formatMoney } from "@/game/format";
import { summitLinkOfferOpen } from "@/game/rules";
import type { GameState } from "@/game/state";
import { useGameStore } from "@/game/store";
import { summitLinkOfferPayment } from "@/game/summitLink";
import { FARE_PRICES } from "@/game/types";
import { RadioCard } from "@/ui/kit/RadioCard";

const maxFare = formatMoney(FARE_PRICES.balanced);

export function SummitLinkCard({ night }: { night: GameState }) {
  const decision = night.nightRecap?.summitLinkReply;
  if (decision) {
    return (
      <p className="chip mt-3 px-3 py-2 text-sm font-bold" role="status">
        {decision === "accepted"
          ? `Whiterock Pass deal active. Tickets stay capped at Balanced (${maxFare}).`
          : "You turned down Whiterock. Dutch Hill sets its own ticket prices."}
      </p>
    );
  }
  if (!summitLinkOfferOpen(night)) return null;
  const offerPayment = formatMoney(summitLinkOfferPayment(night.reputation));
  const visit = night.vivianVisit;
  const scoutLine = visit
    ? ` Our scout clocked ${Math.round(visit.avgWaitMin)}-min lift lines and ${Math.round(visit.avgSnow * 100)}% cover on Day ${visit.day}.`
    : "";
  const tomLine = night.founderId === "tom"
    ? " Tom's contacts pushed the offer across early."
    : "";

  const blocked = !canTakeSummitLinkEquity(night);
  const buttonClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--lift:4px]";
  return (
    <RadioCard
      title="Whiterock Pass offer"
      from="Sloane Prescott, Whiterock"
      action={
        <>
          {blocked && (
            <p id="summitlink-founder-lock" className="mb-2 text-sm font-bold">
              Riley will not sign a Whiterock deal. He wants Dutch Hill to stay independent.
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
              Take {offerPayment} (cap tickets)
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
      {formatOperatorText(
        `{name}, we can wire ${offerPayment} to Dutch Hill tonight.${scoutLine}${tomLine} In exchange, your lift tickets stay capped at Balanced (${maxFare}) for the rest of the winter.`,
        night.operatorName ?? null,
      )}
    </RadioCard>
  );
}