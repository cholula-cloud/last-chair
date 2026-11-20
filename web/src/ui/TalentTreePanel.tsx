"use client";

import { CREW_TALENTS } from "@/game/talents";
import { useGameStore } from "@/game/store";
import {
  canUnlockTalent,
  CREW_POINT_COST,
  talentRequiresTier,
  TALENT_TREE_COL,
} from "@/game/talentProgress";

const CREW_LABEL = ["Frank", "Dana", "Elena"] as const;

export function TalentTreePanel() {
  const state = useGameStore();
  const rows = CREW_TALENTS.length;

  return (
    <section className="space-y-3" aria-label="Crew talent tree">
      <p className="text-sm font-bold">
        <strong>{state.crewPoints}</strong> crew {state.crewPoints === 1 ? "point" : "points"}.
        Earn one each morning; spend {CREW_POINT_COST} to unlock a talent (lodge tier gates some branches).
      </p>
      <div
        className="panel grid gap-2 p-2"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridTemplateRows: `repeat(${rows}, auto)` }}
      >
        {CREW_TALENTS.map((talent, index) => {
          const owned = state.talentsOwned.includes(talent.id);
          const open = canUnlockTalent(state, talent.id);
          const tier = talentRequiresTier(talent.id);
          const col = TALENT_TREE_COL[talent.id];
          const row = index + 1;
          return (
            <button
              key={talent.id}
              type="button"
              disabled={owned || !open}
              title={talent.effect}
              className={`key press min-h-14 p-2 text-left text-xs font-extrabold ${owned ? "opacity-100" : open ? "" : "opacity-55"}`}
              style={{ gridColumn: col + 1, gridRow: row }}
              onClick={() => state.pickCrewTalent(talent.id)}
            >
              <span className="text-[0.65rem] font-bold text-ink-soft">{CREW_LABEL[col]}</span>
              <span className="block">{talent.name}</span>
              {owned ? (
                <span className="text-[0.65rem] font-bold text-pine">Active</span>
              ) : open ? (
                <span className="text-[0.65rem] font-bold">Unlock ({CREW_POINT_COST} pt)</span>
              ) : (
                <span className="text-[0.65rem] font-bold">
                  {state.lodgeTier < tier ? `Tier ${tier}` : "Needs earlier talent"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}