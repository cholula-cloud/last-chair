"use client";

import { STORY_BEATS } from "@/game/content";
import { liquidNetWorth } from "@/game/economy";
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
  const reputation = useGameStore((s) => s.reputation);
  const completedBeats = useGameStore((s) => s.completedBeats);
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
        <PrimaryButton onClick={bankrupt ? startNewSeason : finishWinterReview}>
          {bankrupt ? "Replay Dutch Hill winter" : "Continue to mountain 2"}
        </PrimaryButton>
      }
    >
      <Sign innerClassName="px-4 pb-4 pt-3" tab="Dutch Hill, season one">
        <p className="display text-[1.35rem] leading-tight text-white">
          {bankrupt ? "The bank called" : "You held one more winter in the sticks."}
        </p>
        {bankrupt && <p className="mt-1 text-sm font-bold text-sign-green-ink">Cash stayed below zero for three mornings in a row.</p>}
        <div className="sign-rule my-3" aria-hidden="true" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
          <StatTile onSign label="Cash" value={formatMoney(cash)} />
          <StatTile onSign label="Reputation" value={reputation} />
          <StatTile
            onSign
            label="Story beats"
            value={`${completedBeats.length}/${STORY_BEATS.length}`}
          />
          <StatTile onSign label="Crew talents" value={talentsOwned.length} />
        </div>
      </Sign>
      {netWorth !== cash && (
        <p className="chip mt-4 px-3.5 py-3 font-bold">
          Net worth after outstanding debts <strong>{formatMoney(netWorth)}</strong>
        </p>
      )}
      {!bankrupt && <div className="chip mt-4 flex items-center gap-3 px-3.5 py-3">
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
