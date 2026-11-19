"use client";

import { SUMMIT_LINK_PAYMENT } from "@/game/summitLink";
import { liquidNetWorth, payoffAmount } from "@/game/economy";
import { surpriseRadio } from "@/game/surprises";
import { schoolMemory } from "@/game/winterMemory";
import { formatMoney } from "@/game/format";
import { useGameStore } from "@/game/store";
import { Sheet } from "@/ui/kit/Sheet";
import { PinIcon } from "@/ui/kit/icons";
import { PrimaryButton, Sign, StatTile } from "@/ui/kit/parts";

export function WinterReviewSheet() {
  const phase = useGameStore((s) => s.phase);
  const bankrupt = useGameStore((s) => s.outcome === "bankrupt");
  const cash = useGameStore((s) => s.cash);
  const netWorth = useGameStore(liquidNetWorth);
  const solvent = !bankrupt && netWorth >= 0;
  const localMemory = useGameStore((s) => s.surpriseLog?.at(-1));
  const school = useGameStore((s) => s.schoolContract);
  const summitLink = useGameStore((s) => s.summitLinkDecision);
  const reputation = useGameStore((s) => s.reputation);
  const lodgeTier = useGameStore((s) => s.lodgeTier);
  const loan = useGameStore((s) => s.loan ? payoffAmount(s.loan) : 0);
  const construction = useGameStore((s) => s.payables.reduce((sum, item) => sum + item.amount, 0));
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const finishWinterReview = useGameStore((s) => s.finishWinterReview);
  const startNewSeason = useGameStore((s) => s.startNewSeason);

  if (phase !== "winter_review" && phase !== "mountain2") return null;

  if (phase === "mountain2") {
    return (
      <Sheet
        modal
        z="z-50"
        title="Tenney Mountain, NH"
        subtitle="The next lost hill on the map"
        footer={
          <PrimaryButton onClick={startNewSeason}>
            Replay Dutch Hill winter
          </PrimaryButton>
        }
      >
        <div className="panel px-4 py-3.5">
          <p className="text-[1rem] font-bold leading-snug">
            Tenney isn&apos;t playable yet. Caretaker income and the career map
            come in a later build. Dutch Hill stays saved on this device.
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      modal
      z="z-50"
      title="Winter review"
      subtitle="Dutch Hill, season one"
      footer={
        <PrimaryButton onClick={solvent ? finishWinterReview : startNewSeason}>
          {solvent ? "Continue to mountain 2" : "Replay Dutch Hill winter"}
        </PrimaryButton>
      }
    >
      <Sign innerClassName="px-4 pb-4 pt-3" tab="Dutch Hill, season one">
        <p className="display text-[1.35rem] leading-tight text-white">
          {bankrupt ? "The bank called" : solvent ? "Dutch Hill kept the lights on." : "The tow ran to closing day. The winter bills outlasted it."}
        </p>
        {bankrupt && <p className="mt-1 text-sm font-bold text-sign-green-ink">Cash stayed below zero for three mornings in a row.</p>}
        <div className="sign-rule my-3" aria-hidden="true" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
          <StatTile onSign label="Cash" value={formatMoney(cash)} />
          <StatTile onSign label="Reputation" value={reputation} />
          <StatTile
            onSign
            label="Lodge tier"
            value={lodgeTier}
          />
          <StatTile onSign label="Crew talents" value={talentsOwned.length} />
        </div>
      </Sign>
      {netWorth !== cash && (
        <p className="chip mt-4 px-3.5 py-3 font-bold">
          Cash {formatMoney(cash)} less loan {formatMoney(loan)} and unpaid construction {formatMoney(construction)} leaves <strong>{formatMoney(netWorth)}</strong>.
        </p>
      )}
      <section className="panel mt-4 space-y-2 px-4 py-3" aria-label="What the town remembers">
        <h3 className="font-extrabold">What the town remembers</h3>
        {localMemory && <p>From the day {localMemory.dayIndex} broadcast: “{surpriseRadio(localMemory).radio}”</p>}
        <p>{schoolMemory(school)}</p>
        <p>{summitLink === "accepted" ? `Vivian put ${formatMoney(SUMMIT_LINK_PAYMENT)} into Dutch Hill. Tickets stayed at Balanced or below for the rest of the winter.`
          : summitLink === "declined" ? "Vivian left without a deal. Dutch Hill set its own prices through closing day."
          : "The ticket window stayed in local hands."}</p>
      </section>
      {solvent && <div className="chip mt-4 flex items-center gap-3 px-3.5 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-snow-2">
          <PinIcon size={20} />
        </span>
        <p className="text-[1rem] font-bold">
          Career pin unlocked:{" "}
          <strong className="font-extrabold">Tenney Mountain, NH</strong>
        </p>
      </div>}
    </Sheet>
  );
}
