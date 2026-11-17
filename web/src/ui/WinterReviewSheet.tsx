"use client";

import { STORY_BEATS } from "@/game/content";
import { formatMoney } from "@/game/format";
import { useGameStore } from "@/game/store";
import { PaperSheet } from "@/ui/kit/PaperSheet";
import { PrimaryButton, StatTile } from "@/ui/kit/parts";

export function WinterReviewSheet() {
  const phase = useGameStore((s) => s.phase);
  const cash = useGameStore((s) => s.cash);
  const reputation = useGameStore((s) => s.reputation);
  const completedBeats = useGameStore((s) => s.completedBeats);
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const finishWinterReview = useGameStore((s) => s.finishWinterReview);
  const startNewSeason = useGameStore((s) => s.startNewSeason);

  if (phase !== "winter_review" && phase !== "mountain2") return null;

  if (phase === "mountain2") {
    return (
      <PaperSheet
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
        <p className="text-[0.95rem] leading-relaxed text-ink">
          Tenney isn&apos;t playable yet. Caretaker income and the career map
          come in a later build. Dutch Hill stays saved on this device.
        </p>
      </PaperSheet>
    );
  }

  return (
    <PaperSheet
      modal
      z="z-50"
      title="Winter review"
      subtitle="Dutch Hill, season one"
      footer={
        <PrimaryButton onClick={finishWinterReview}>
          Continue to mountain 2
        </PrimaryButton>
      }
    >
      <p className="pencil px-1 text-[1.05rem] text-pine">
        You held one more winter in the sticks.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl border border-ink/10 bg-white/35 px-3.5 py-3 sm:grid-cols-4">
        <StatTile
          label="Cash"
          value={formatMoney(cash)}
          tone={cash >= 0 ? "good" : "bad"}
        />
        <StatTile label="Reputation" value={reputation} />
        <StatTile
          label="Story beats"
          value={`${completedBeats.length}/${STORY_BEATS.length}`}
        />
        <StatTile label="Crew talents" value={talentsOwned.length} />
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border-[1.5px] border-dashed border-amber/70 bg-[#fff6ec] px-3.5 py-3">
        <span
          className="size-3 shrink-0 rounded-full bg-amber ring-4 ring-amber/25"
          aria-hidden="true"
        />
        <p className="text-[0.95rem] text-ink">
          Career pin unlocked:{" "}
          <strong className="serif">Tenney Mountain, NH</strong>
        </p>
      </div>
    </PaperSheet>
  );
}
